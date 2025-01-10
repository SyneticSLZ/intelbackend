// server.jconst yahooFinance = require('yahoo-finance2').default;s
const yahooFinance = require('yahoo-finance2').default;
const https = require('https');
const { parseString } = require('xml2js');
const { promisify } = require('util');
const parseXML = promisify(parseString);
const fs = require('fs').promises;
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const Parser = require('rss-parser');
// const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
// const axios = require('axios');
// Load environment variables
dotenv.config();

const app = express();
// console.log('API Key:', process.env.CRUNCHBASE_API_KEY);
// Middleware
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Endpoints
// SEC_USER_AGENT=
// USPTO_API_KEY=
// NEWS_API_KEY=af2ada1b2b3146b0b1af57120d39faa9
// LINKEDIN_ACCESS_TOKEN=
// ALPHA_VANTAGE_API_KEY=
// OPENCORPORATES_API_TOKEN=

// Trademarks

async function getRecentTrademarks(options = {}) {
  const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
      limit = 50,
      offset = 0
  } = options;

  const baseUrl = 'https://developer.uspto.gov/ipmarketplace/api/v1/trademark/application';
  
  try {
      const queryParams = new URLSearchParams({
          start: offset,
          rows: limit,
          filingDateFrom: startDate,
          sort: 'filingDate desc'
      });

      const response = await fetch(`${baseUrl}?${queryParams}`, {
          method: 'GET',
          headers: {
              'Accept': 'application/json',
          }
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the response into a more readable format
      return {
          totalResults: data.recordTotalQuantity,
          trademarks: data.applications.map(app => ({
              serialNumber: app.serialNumber,
              filingDate: app.filingDate,
              markVerbalElementText: app.markVerbalElementText,
              ownerName: app.ownerName,
              status: app.status,
              goodsAndServices: app.goodsAndServices
          }))
      };
  } catch (error) {
      console.error('Error fetching trademark data:', error);
      throw error;
  }
}

// Example usage:
async function displayTrademarks() {
  try {
      const result = await getRecentTrademarks({
          startDate: '2024-01-01',
          limit: 10
      });
      
      const container = document.createElement('div');
      container.className = 'trademark-container max-w-4xl mx-auto p-4';
      
      result.trademarks.forEach(trademark => {
          const card = document.createElement('div');
          card.className = 'bg-white shadow rounded-lg p-4 mb-4';
          
          card.innerHTML = `
              <h3 class="text-lg font-bold mb-2">${trademark.markVerbalElementText || 'Unnamed Mark'}</h3>
              <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                      <span class="font-semibold">Serial Number:</span>
                      <span>${trademark.serialNumber}</span>
                  </div>
                  <div>
                      <span class="font-semibold">Filing Date:</span>
                      <span>${new Date(trademark.filingDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                      <span class="font-semibold">Owner:</span>
                      <span>${trademark.ownerName}</span>
                  </div>
                  <div>
                      <span class="font-semibold">Status:</span>
                      <span>${trademark.status}</span>
                  </div>
              </div>
              <div class="mt-2">
                  <span class="font-semibold">Goods & Services:</span>
                  <p class="text-sm mt-1">${trademark.goodsAndServices}</p>
              </div>
          `;
          
          container.appendChild(card);
      });
      
      document.body.appendChild(container);
  } catch (error) {
      console.error('Error:', error);
  }
}

// SEC EDGAR API Test
async function testSECFilings(companyName) {
    try {
        // First get CIK number
        const response = await axios.get(`https://data.sec.gov/submissions/CIK${companyName}.json`, {
            headers: {
                'User-Agent': process.env.SEC_USER_AGENT
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('SEC API Error:', error.message);
        return null;
    }
  }

  // const fs = require('fs');

class EdgarClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
  }

  async findCompanies(maxCompanies = 20) {
    const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'Company Name marketing-analysis@domain.com' }
    });
    const data = await response.json();
    return Object.values(data)
      .slice(0, maxCompanies)
      .map(company => ({
        name: company.title,
        cik: String(company.cik_str).padStart(10, '0'),
        ticker: company.ticker
      }));
  }

  async getCompanyData(cik) {
    try {
      const response = await fetch(`${this.baseUrl}/CIK${cik}.json`, {
        headers: {
          'User-Agent': 'Company Name marketing-analysis@domain.com',
          'Accept': 'application/json',
          'X-API-KEY': this.apiKey
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching data for CIK ${cik}:`, error);
      return null;
    }
  }

  async findTriggers(company) {
    const data = await this.getCompanyData(company.cik);
    if (!data) return null;

    const triggers = [];
    const metrics = this.extractMetrics(data);

    // Revenue growth trigger
    if (metrics.revenueGrowth && metrics.revenueGrowth < 10) {
      triggers.push({
        type: 'Low Growth',
        details: `${metrics.revenueGrowth.toFixed(1)}% YoY revenue growth`,
        opportunity: 'May need marketing help to accelerate growth'
      });
    }

    // Small marketing budget trigger
    if (metrics.marketingExpense && metrics.marketingExpense < 1000000) {
      triggers.push({
        type: 'Low Marketing Spend',
        details: `$${(metrics.marketingExpense/1000000).toFixed(2)}M annual marketing spend`,
        opportunity: 'Room to expand marketing initiatives'
      });
    }

    // Low digital presence trigger
    if (metrics.technicalExpense && metrics.technicalExpense < 500000) {
      triggers.push({
        type: 'Low Digital Investment',
        details: `$${(metrics.technicalExpense/1000000).toFixed(2)}M technical spend`,
        opportunity: 'May need digital transformation support'
      });
    }

    return {
      name: company.name,
      cik: company.cik,
      ticker: company.ticker,
      metrics,
      triggers
    };
  }

  extractMetrics(data) {
    const metrics = {};
    const extractValue = (concept) => {
      const values = data.facts?.['us-gaap']?.[concept]?.units?.USD;
      if (!values?.length) return null;
      const sorted = [...values].sort((a, b) => new Date(b.end) - new Date(a.end));
      return {
        current: sorted[0].val,
        previous: sorted[1]?.val,
        growth: sorted[1] ? ((sorted[0].val - sorted[1].val) / sorted[1].val) * 100 : null
      };
    };

    const revenue = extractValue('Revenues');
    metrics.revenue = revenue?.current;
    metrics.revenueGrowth = revenue?.growth;
    metrics.marketingExpense = extractValue('MarketingExpense')?.current;
    metrics.technicalExpense = extractValue('TechnologyExpense')?.current;

    return metrics;
  }
}

async function findTargetCompanies(apiKey, maxCompanies = 20) {
  const client = new EdgarClient(apiKey);
  const companies = await client.findCompanies(maxCompanies);
  const results = [];

  for (const company of companies) {
    console.log(`Analyzing ${company.name}...`);
    const analysis = await client.findTriggers(company);
    if (analysis?.triggers.length > 0) {
      results.push(analysis);
    }
    console.log(analysis)
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
  }

  fs.writeFileSync('target_companies.json', JSON.stringify(results, null, 2));
  return results;
}
// class EdgarClient {
//   constructor(apiKey) {
//     this.apiKey = apiKey;
//     this.baseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
//   }

//   static async findCompanies() {
//     const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
//       headers: { 'User-Agent': 'Company Name marketing-analysis@domain.com' }
//     });
//     const data = await response.json();
//     return Object.values(data).map(company => ({
//       name: company.title,
//       cik: company.cik_str,
//       ticker: company.ticker
//     }));
//   }

//   async getCompanyData(cik) {
//     for (let attempt = 1; attempt <= 3; attempt++) {
//       try {
//         const paddedCik = String(cik).padStart(10, '0');
//         const url = `${this.baseUrl}/CIK${paddedCik}.json`;
//         const response = await fetch(url, {
//           headers: {
//             'User-Agent': 'Company Name marketing-analysis@domain.com',
//             'Accept': 'application/json',
//             'X-API-KEY': this.apiKey
//           }
//         });

//         if (response.status === 429) {
//           await delay(2000 * attempt);
//           continue;
//         }

//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
//         return await response.json();
//       } catch (error) {
//         console.error(`Attempt ${attempt} failed:`, error);
//         if (attempt === 3) return null;
//         await delay(1000);
//       }
//     }
//   }

//   extractFactValue(data, taxonomy, concept) {
//     return data?.facts?.[taxonomy]?.[concept]?.units?.USD || null;
//   }

//   async analyzeMarketingPotential(cik) {
//     const data = await this.getCompanyData(cik);
//     if (!data) return null;

//     const revenues = this.extractFactValue(data, 'us-gaap', 'Revenues');
//     const netIncome = this.extractFactValue(data, 'us-gaap', 'NetIncomeLoss');
//     const marketingExpense = this.extractFactValue(data, 'us-gaap', 'MarketingExpense');

//     let score = 0;
//     const insights = [];

//     // Calculate revenue growth
//     if (revenues?.length >= 2) {
//       const sorted = [...revenues].sort((a, b) => new Date(b.end) - new Date(a.end));
//       const growth = ((sorted[0].val - sorted[1].val) / sorted[1].val) * 100;
//       if (growth < 10) {
//         score += 30;
//         insights.push('Low revenue growth indicates potential need for marketing');
//       }
//     }

//     // Analyze marketing spend
//     if (marketingExpense?.length > 0) {
//       const latest = marketingExpense[marketingExpense.length - 1];
//       if (latest.val < 1000000) {
//         score += 40;
//         insights.push('Low marketing spend suggests room for expansion');
//       }
//     }

//     // Calculate profit margin
//     if (netIncome?.length > 0 && revenues?.length > 0) {
//       const margin = (netIncome[netIncome.length - 1].val / revenues[revenues.length - 1].val) * 100;
//       if (margin > 15) {
//         score += 30;
//         insights.push('Healthy profit margin indicates budget capacity');
//       }
//     }

//     return {
//       score,
//       insights,
//       recommendation: score > 60 ? 'High potential' : 'Moderate potential'
//     };
//   }
// }

// async function analyzePotentialClient(apiKey, cik) {
  // const client = new EdgarClient(apiKey);
//   const analysis = await client.analyzeMarketingPotential(cik);
//   if (analysis) {
//     console.log(`\nAnalysis for CIK ${cik}:`);
//     console.log(`Score: ${analysis.score}/100`);
//     console.log('Insights:', analysis.insights);
//     console.log('Recommendation:', analysis.recommendation);
//   }
//   return analysis;
// }

// News API (using NewsAPI.org)
async function searchBusinessNews(companyName) {
  try {
      // Keywords that indicate potential marketing opportunities
      const marketingTriggers = [
          'merger',
          'acquisition',
          'funding',
          'investment',
          'expansion',
          'growth',
          'hiring',
          'IPO',
          'rebrand',
          'launch',
          'expansion',
          'partnership',
          'subsidy',
          'grant'
      ];

      // Create the search query
      const baseQuery = companyName;
      const triggerQuery = marketingTriggers.join(' OR ');
      const fullQuery = `${baseQuery} AND (${triggerQuery})`;

      // Make the API request
      const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
              q: fullQuery,
              sortBy: 'publishedAt',
              language: 'en',
              pageSize: 20, // Increased to get more relevant results
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
          },
          headers: {
              'X-Api-Key': process.env.NEWS_API_KEY
          }
      });

      // Process and categorize the results
      const categorizedNews = response.data.articles.reduce((acc, article) => {
          const title = article.title.toLowerCase();
          const description = article.description ? article.description.toLowerCase() : '';
          const content = article.content ? article.content.toLowerCase() : '';
          
          // Categorize the article based on content
          const category = marketingTriggers.find(trigger => 
              title.includes(trigger) || 
              description.includes(trigger) || 
              content.includes(trigger)
          ) || 'general';

          // Add article to its category
          if (!acc[category]) {
              acc[category] = [];
          }
          
          acc[category].push({
              title: article.title,
              url: article.url,
              publishedAt: article.publishedAt,
              source: article.source.name,
              category: category,
              summary: article.description
          });

          return acc;
      }, {});

      // Add metadata about the search
      const result = {
          company: companyName,
          searchDate: new Date().toISOString(),
          totalResults: response.data.totalResults,
          categorizedNews: categorizedNews,
          marketingOpportunityScore: calculateOpportunityScore(categorizedNews)
      };

      return result;

  } catch (error) {
      console.error('News API Error:', error.message);
      throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

function calculateOpportunityScore(categorizedNews) {
  // Weights for different types of news
  const weights = {
      merger: 0.9,
      acquisition: 0.9,
      funding: 0.8,
      expansion: 0.7,
      growth: 0.6,
      hiring: 0.5,
      partnership: 0.6,
      subsidy: 0.7,
      grant: 0.7,
      general: 0.3
  };

  // Calculate weighted score based on number of articles in each category
  let totalScore = 0;
  let totalArticles = 0;

  Object.entries(categorizedNews).forEach(([category, articles]) => {
      const weight = weights[category] || weights.general;
      totalScore += articles.length * weight;
      totalArticles += articles.length;
  });

  // Normalize score to 0-100 range
  return totalArticles > 0 ? Math.min(Math.round((totalScore / totalArticles) * 100), 100) : 0;
}


// Job Postings (using LinkedIn API)
async function testJobPostings(companyName) {
    try {
        const response = await axios.get('https://api.linkedin.com/v2/jobSearch', {
            params: {
                keywords: companyName
            },
            headers: {
                'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('LinkedIn API Error:', error.message);
        return null;
    }
}

async function analyzeMarketingHiring({ 
  daysToAnalyze = 30,
  marketingJobThreshold = 3,
  locationFilter = 'United States'
}) {
  const marketingKeywords = [
      'marketing',
      'digital marketing',
      'content marketing',
      'social media marketing',
      'marketing manager'
  ];

  function httpsGet(url) {
      return new Promise((resolve, reject) => {
          https.get(url, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
          }, (resp) => {
              let data = '';
              resp.on('data', (chunk) => data += chunk);
              resp.on('end', () => resolve(data));
          }).on('error', reject);
      });
  }

  async function searchJobs(keyword) {
      try {
          // Using Indeed's JSON endpoint
          const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(locationFilter)}&sort=date&fromage=${daysToAnalyze}&format=json`;
          const response = await httpsGet(url);
          
          // Basic parsing to extract job information
          const jobMatches = response.match(/jobmap\[(\d+)\] = ({.*?});/g) || [];
          const jobs = [];

          for (const match of jobMatches) {
              try {
                  const jsonStr = match.split('= ')[1].slice(0, -1);
                  const job = JSON.parse(jsonStr);
                  
                  if (job.company && job.title) {
                      jobs.push({
                          title: job.title,
                          company: job.company,
                          location: job.locale || locationFilter,
                          postDate: new Date(),  // Indeed doesn't provide exact date in this format
                          link: `https://www.indeed.com/viewjob?jk=${job.jk}`,
                          salary: job.salary || null
                      });
                  }
              } catch (e) {
                  continue;
              }
          }

          return jobs;
      } catch (error) {
          console.error(`Error fetching jobs for ${keyword}:`, error);
          return [];
      }
  }

  function groupJobsByCompany(jobs) {
      return jobs.reduce((acc, job) => {
          const company = job.company?.toLowerCase();
          if (!company) return acc;
          
          if (!acc[company]) {
              acc[company] = {
                  name: job.company,
                  jobs: [],
                  totalJobs: 0,
                  location: job.location || locationFilter
              };
          }
          
          acc[company].jobs.push({
              title: job.title,
              link: job.link || null,
              salary: job.salary || null
          });
          acc[company].totalJobs++;
          
          return acc;
      }, {});
  }

  // Collect all jobs across keywords
  let allJobs = [];
  for (const keyword of marketingKeywords) {
      try {
          const jobs = await searchJobs(keyword);
          allJobs = allJobs.concat(jobs);
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
          console.error(`Error processing keyword ${keyword}:`, error);
      }
  }

  // Group and filter companies
  const companiesMap = groupJobsByCompany(allJobs);
  
  // Return companies with significant marketing hiring
  return Object.values(companiesMap)
      .filter(company => company.totalJobs >= marketingJobThreshold)
      .sort((a, b) => b.totalJobs - a.totalJobs);
}

// Financial Data (using Alpha Vantage)
async function testFinancialData(symbol) {
    try {
        const response = await axios.get('https://www.alphavantage.co/query', {
            params: {
                function: 'OVERVIEW',
                symbol: symbol,
                apikey: process.env.ALPHA_VANTAGE_API_KEY
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Alpha Vantage API Error:', error.message);
        return null;
    }
}

// Crunchbase-like Startup Data (using free alternatives)
async function testStartupData(companyName) {
    try {
        // Using OpenCorporates API as a free alternative
        const response = await axios.get(`https://api.opencorporates.com/v0.4/companies/search`, {
            params: {
                q: companyName,
                api_token: process.env.OPENCORPORATES_API_TOKEN
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('OpenCorporates API Error:', error.message);
        return null;
    }
}


// Local storage to keep track of companies and their history
let trackedCompanies = new Map();

// Utility function for making API requests
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API Request Error: ${error.message}`);
        return null;
    }
}

// Function to discover companies based on industry/keyword
async function discoverCompanies(keyword, options = {}) {
    const {
        maxResults = 10,
        minEmployees = 0,
        maxEmployees = 1000,
        foundedAfter = '2023-01-01'
    } = options;

    const companies = new Set();

    // Check CrunchBase alternative (OpenCorporates)
    const openCorpResults = await makeRequest(
        `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(keyword)}`
    );
    if (openCorpResults?.results) {
        openCorpResults.results.forEach(company => companies.add({
            name: company.name,
            source: 'OpenCorporates',
            foundedDate: company.incorporation_date,
            url: company.opencorporates_url
        }));
    }

    // Check ProductHunt
    const phResponse = await fetch(`https://www.producthunt.com/feed`);
    const phText = await phResponse.text();
    const phItems = phText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    phItems
        .filter(item => item.toLowerCase().includes(keyword.toLowerCase()))
        .forEach(item => {
            const name = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
            companies.add({
                name,
                source: 'ProductHunt',
                foundedDate: new Date().toISOString().split('T')[0],
                url: item.match(/<link>(.*?)<\/link>/)?.[1] || ''
            });
        });

    // Check GitHub organizations
    const githubResults = await makeRequest(
        `https://api.github.com/search/users?q=${encodeURIComponent(keyword)}+type:organization`
    );
    if (githubResults?.items) {
        for (const org of githubResults.items.slice(0, 5)) {
            const details = await makeRequest(org.url);
            if (details) {
                companies.add({
                    name: details.name || org.login,
                    source: 'GitHub',
                    foundedDate: details.created_at?.split('T')[0],
                    url: details.html_url
                });
            }
        }
    }

    // Check AngelList via RSS
    const alResponse = await fetch('https://angel.co/company-sitemap.xml');
    const alText = await alResponse.text();
    const alItems = alText.match(/<url>[\s\S]*?<\/url>/g) || [];
    
    alItems
        .filter(item => item.toLowerCase().includes(keyword.toLowerCase()))
        .slice(0, 5)
        .forEach(item => {
            const name = item.match(/<loc>(.*?)<\/loc>/)?.[1].split('/').pop() || '';
            companies.add({
                name,
                source: 'AngelList',
                foundedDate: new Date().toISOString().split('T')[0],
                url: item.match(/<loc>(.*?)<\/loc>/)?.[1] || ''
            });
        });

    return Array.from(companies).slice(0, maxResults);
}

// Function to start tracking a company
function startTracking(company) {
    if (!trackedCompanies.has(company.name)) {
        trackedCompanies.set(company.name, {
            ...company,
            trackingStarted: new Date().toISOString(),
            history: [],
            lastChecked: null
        });
    }
    return trackedCompanies.get(company.name);
}

// Function to update tracking data for a company
async function updateCompanyData(companyName) {
    const company = trackedCompanies.get(companyName);
    if (!company) return null;

    const updates = {
        timestamp: new Date().toISOString(),
        changes: []
    };

    // Check OpenCorporates for updates
    const ocData = await makeRequest(
        `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}`
    );
    if (ocData?.results?.[0]) {
        updates.changes.push({
            source: 'OpenCorporates',
            type: 'company_info',
            data: ocData.results[0]
        });
    }

    // Check ProductHunt for new products
    const phResponse = await fetch(`https://www.producthunt.com/feed`);
    const phText = await phResponse.text();
    const phItems = phText.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const newProducts = phItems
        .filter(item => item.toLowerCase().includes(companyName.toLowerCase()))
        .map(item => ({
            title: item.match(/<title>(.*?)<\/title>/)?.[1] || '',
            url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
            date: item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
        }));

    if (newProducts.length > 0) {
        updates.changes.push({
            source: 'ProductHunt',
            type: 'new_products',
            data: newProducts
        });
    }

    // Update company history
    if (updates.changes.length > 0) {
        company.history.push(updates);
    }
    company.lastChecked = updates.timestamp;
    
    return updates;
}

// Function to get tracking history for a company
function getCompanyHistory(companyName) {
    const company = trackedCompanies.get(companyName);
    if (!company) return null;
    
    return {
        company: {
            name: company.name,
            source: company.source,
            foundedDate: company.foundedDate,
            url: company.url
        },
        trackingStarted: company.trackingStarted,
        lastChecked: company.lastChecked,
        history: company.history
    };
}





class SECAnalyzer {
  constructor(apiKey) {
      this.apiKey = apiKey;
      this.baseUrl = 'https://www.sec.gov/';
      this.headers = {
          'User-Agent': 'Company Name admin@company.com',
          'Accept': 'application/json',
          'X-SEC-API-KEY': this.apiKey
      };
  }

  async getCompanies() {
      const { data } = await axios.get(`${this.baseUrl}files/company_tickers.json`, {
          headers: this.headers
      });
      return Object.values(data).filter(company => company.cik_str && company.title);
  }

  async getFilings(cik) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      try {
          const response = await axios.get(
              `${this.baseUrl}Archives/edgar/data/${parseInt(cik)}/index.json`,
              { headers: this.headers }
          );

          return response.data.directory.item.filter(filing => {
              const filingDate = new Date(filing.last_modified);
              return filingDate > oneMonthAgo;
          });
      } catch (error) {
          console.error(`Error fetching filings for CIK ${cik}:`, error.message);
          return [];
      }
  }

  async analyzeFilings(companies) {
      const report = {
          management_changes: [],
          acquisitions_mergers: [],
          major_contracts: [],
          bankruptcies: [],
          asset_sales: [],
          debt_changes: [],
          financial_performance: [],
          ownership_changes: [],
          registrations: [],
          proxy_updates: []
      };

      for (const company of companies) {
          console.log(`Analyzing ${company.title}...`);
          const filings = await this.getFilings(company.cik_str);
          
          for (const filing of filings) {
              const analysis = await this.analyzeFilingContent(company, filing);
              
              // Merge analysis results into report categories
              Object.keys(analysis).forEach(category => {
                  if (analysis[category]) {
                      report[category].push({
                          company: company.title,
                          cik: company.cik_str,
                          date: filing.last_modified,
                          details: analysis[category]
                      });
                  }
              });
          }
      }

      return report;
  }

  async analyzeFilingContent(company, filing) {
      try {
          const { data: text } = await axios.get(
              `${this.baseUrl}Archives/edgar/data/${parseInt(company.cik_str)}/${filing.name}`,
              { headers: this.headers }
          );

          const triggers = {
              management_changes: this.detectManagementChanges(text),
              acquisitions_mergers: this.detectAcquisitions(text),
              major_contracts: this.detectContracts(text),
              bankruptcies: this.detectBankruptcy(text),
              asset_sales: this.detectAssetSales(text),
              debt_changes: this.detectDebtChanges(text),
              financial_performance: this.detectFinancialChanges(text),
              ownership_changes: this.detectOwnershipChanges(text),
              registrations: this.detectRegistrations(text),
              proxy_updates: this.detectProxyUpdates(text)
          };

          return triggers;
      } catch (error) {
          console.error(`Error analyzing filing ${filing.name}:`, error.message);
          return {};
      }
  }

  detectManagementChanges(text) {
      const patterns = [
          /appointed.*(?:CEO|CFO|COO|CTO|President)/i,
          /resigned.*(?:CEO|CFO|COO|CTO|President)/i,
          /new.*(?:Chief.*Officer|President|Director)/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectAcquisitions(text) {
      const patterns = [
          /(?:acquired|acquisition of|merge with|merger|purchase of).*(?:company|business|entity)/i,
          /completed.*acquisition/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectContracts(text) {
      const patterns = [
          /(?:entered into|signed|executed).*(?:agreement|contract)/i,
          /material definitive agreement/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectBankruptcy(text) {
      const patterns = [
          /bankruptcy|chapter 11|chapter 7|reorganization|liquidation/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectAssetSales(text) {
      const patterns = [
          /(?:sale|sold|dispose|disposition).*(?:assets|property|subsidiary|division)/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectDebtChanges(text) {
      const patterns = [
          /(?:new|amended|modified).*(?:credit facility|loan|debt|borrowing)/i,
          /refinancing|restructuring/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectFinancialChanges(text) {
      const patterns = [
          /revenue.*increased|decreased/i,
          /profit.*increased|decreased/i,
          /significant.*(?:growth|decline)/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectOwnershipChanges(text) {
      const patterns = [
          /beneficial ownership/i,
          /(?:increased|decreased).*stake/i,
          /stock purchase/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectRegistrations(text) {
      const patterns = [
          /registration statement/i,
          /(?:initial|secondary).*offering/i,
          /(?:common stock|securities).*offering/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  detectProxyUpdates(text) {
      const patterns = [
          /proxy statement/i,
          /shareholder.*meeting/i,
          /board.*(?:election|appointment)/i
      ];
      
      const matches = patterns.map(p => text.match(p)).filter(Boolean);
      return matches.length > 0 ? matches.map(m => m[0]) : null;
  }

  generateFormattedReport(report) {
      let markdown = '# SEC Filing Events Report\n\n';
      
      Object.entries(report).forEach(([category, events]) => {
          if (events.length > 0) {
              markdown += `## ${category.replace(/_/g, ' ').toUpperCase()}\n\n`;
              events.forEach(event => {
                  markdown += `### ${event.company} (CIK: ${event.cik})\n`;
                  markdown += `- Date: ${new Date(event.date).toLocaleDateString()}\n`;
                  markdown += `- Details:\n`;
                  event.details.forEach(detail => {
                      markdown += `  - ${detail}\n`;
                  });
                  markdown += '\n';
              });
          }
      });

      return markdown;
  }

  async analyze() {
      console.log('Starting analysis...');
      const companies = await this.getCompanies();
      console.log(`Analyzing ${companies.length} companies...`);
      
      const report = await this.analyzeFilings(companies);
      const formattedReport = this.generateFormattedReport(report);
      
      fs.writeFileSync('sec_report.md', formattedReport);
      console.log('Report generated: sec_report.md');
      
      return report;
  }
}



// Example usage
async function runTests() {
    try {

      //SEC EDGAR 

        // Test company: Apple
        // console.log('Testing SEC Filings...');
        const secData = await testSECFilings('0000066740');
        console.log(JSON.stringify(secData, null, 2));

        // Find tech companies with market cap > $1B
// const companies = await EdgarClient.findCompanies({
//   industry: 'technology',
//   minMarketCap: 1000000000
// });

// Analyze each company
// for (const company of companies) {
//   await analyzePotentialClient(process.env.SEC_USER_AGENT, company.cik);
// }

// const companies = await findTargetCompanies(process.env.SEC_USER_AGENT, 5);
// console.log(JSON.stringify(companies, null, 2));

//TRADEMARKS

// getRecentTrademarks({ startDate: '2024-01-01', limit: 10 })
//   .then(data => {
//     console.log(data);
//   })
//   .catch(error => {
//     console.error(error);
//   });
  

//         console.log('\nTesting Trademarks...');
//         const trademarkData = await testTrademarks('Apple');
//         console.log(JSON.stringify(trademarkData, null, 2));

//NEWS
        // console.log('\nTesting News...');
        // const newsData = await testNewsSearch('Apple');
        // console.log(JSON.stringify(newsData, null, 2));

      //   try {
      //     const results = await searchBusinessNews('Tesla');
      //     console.log('Marketing Opportunity Score:', results.marketingOpportunityScore);
      //     console.log('Categorized News:', results.categorizedNews);
      // } catch (error) {
      //     console.error('Error:', error.message);
      // }


//HIRING
    //   try {
    //     const results = await analyzeMarketingHiring({
    //         daysToAnalyze: 300,
    //         marketingJobThreshold: 3,
    //         locationFilter: 'United States'
    //     });
    //     console.log(JSON.stringify(results, null, 2));
    // } catch (error) {
    //     console.error('Error:', error);
    // }



        // console.log('\nTesting Financial Data...');
        // const financialData = await testFinancialData('AAPL');
        // console.log(JSON.stringify(financialData, null, 2));
//STARTUPS 

    // Discover companies in AI industry
  //   const aiCompanies = await discoverCompanies('cybersecurity', {
  //     maxResults: 20,
  //     foundedAfter: '2024-01-01'
  // });
  // console.log('Discovered companies:', aiCompanies);

  // // // Start tracking the first company
  // if (aiCompanies.length > 0) {
  //     const tracked = startTracking(aiCompanies[0]);
  //     console.log('Started tracking:', tracked);

  //     // Update data for the company
  //     const updates = await updateCompanyData(tracked.name);
  //     console.log('Updates:', updates);

  //     // Get tracking history
  //     const history = getCompanyHistory(tracked.name);
  //     console.log('Tracking history:', history);
  // }

        // console.log('\nTesting Startup Data...');
        // const startupData = await testStartupData('Apple');
        // console.log(JSON.stringify(startupData, null, 2));

    } catch (error) {
        console.error('Test Suite Error:', error);
    }
}



// Required environment variables:


// module.exports = {
//     testSECFilings,
//     testTrademarks,
//     testNewsSearch,
//     testJobPostings,
//     testFinancialData,
//     testStartupData,
//     runTests
// };

// FDA Filings
app.get('/api/fda-filings', async (req, res) => {
  try {
    const response = await axios.get(`https://api.fda.gov/drug/drugsfda.json`, {
      params: {
        api_key: process.env.FDA_API_KEY,
        // search: "submission_status_date:[2024-01-01 TO 2024-12-19]",
        // Correct date format
        limit: 20,
        // sort: undefined
        sort: 'submissions.submission_status_date:desc'
      }
    });

    const filings = response.data.results.map(filing => ({
      company: filing.sponsor_name,
      type: filing.submissions[0]?.submission_type || 'N/A',
      date: filing.submissions[0]?.submission_status_date || 'N/A',
      status: filing.submissions[0]?.submission_status || 'Pending',
      id: filing.application_number
    }));

    res.json(filings);
  } catch (error) {
    console.error('FDA API Error Details:', error.response?.data);

    // console.error('FDA API Error:', error);
    res.status(500).json({ error: 'Error fetching FDA filings' });
  }
});

app.get('/api/patents', async (req, res) => {
  try {
    const url = 'https://api.patentsview.org/patents/query';
    
    const requestBody = {
      q: 
        // _and: [
          {
            "_gte":{"patent_date":"2007-01-09"}}
          //   _gte: {
          //     patent_date: "2024-01-01",
          //     assignee_organization: true
          //   }
          // }

        // ]
      ,
      f: [
        "patent_number",
        "patent_title", 
        "patent_date",
        "patent_type",           // Type of patent
        "patent_kind",           // Kind code
        "assignee_organization", // Organization name
        "assignee_first_name",   // Individual assignee first name
        "assignee_last_name",    // Individual assignee last name
        // To help determine status
        "patent_processing_time", // Time taken for processing

        // Joint venture indicators
        "assignee_sequence",          // Multiple assignees indicate collaboration
        // "coexaminer_group",          // Different examination groups can indicate tech breadth
        
        // Technology transfer indicators
        "uspc_sequence",             // Multiple classifications suggest tech overlap areas
        "cited_patent_number",       // Who they cite shows who they follow
        "citedby_patent_number",     // Who cites them shows industry influence
        // "num_cited_by_us_patents",   // Citation count indicates tech importance
        
        // Geographic scope
        "assignee_country",          // International presence
        "inventor_country",          // R&D locations
        
        // Tech field breadth
        // "wipo_field",               // Technology sectors
        "cpc_group_id",             // Detailed tech classification
        // "uspc_class",               // US tech classification
        
        // Partnership indicators
        // "inventor_organization",     // Research partnerships
        "govint_org_name"           // Government/institution partnerships

      ],
      o: {
        "patent_date": "desc"
      },
      s: [{"patent_date": "desc"}],
      per_page: 100
    };
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const patents = response.data.patents.map(patent => {
      // Get patent status based on available fields
      const status = determinePatentStatus(patent.patent_kind, patent.patent_type);
      
      // Handle company/assignee information
      const assigneeInfo = getAssigneeInfo(patent);
      console.log(patent)
      return {
        title: patent.patent_title,
        company: assigneeInfo.company,
        assigneeType: assigneeInfo.type,
        issueDate: patent.patent_date,
        id: patent.patent_number,
        status: status,
        type: patent.patent_type || 'Unknown Type',
        applicationNumber: patent.application_number,
        asignee : patent.assignees[0].assignee_organization || 'Unknown Type'
      };
    });
    
    res.json(patents);
  } catch (error) {
    console.error('PatentsView API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error fetching patent data',
      details: error.response?.data || error.message 
    });
  }
});

// Helper function to determine patent status from available fields
function determinePatentStatus(kindCode, patentType) {
  // Kind codes indicate the publication level
  const kindCodeMap = {
    'A1': 'Patent Application Publication',
    'A2': 'Second Patent Application Publication',
    'A9': 'Corrected Patent Application Publication',
    'B1': 'Granted Patent (No previous publication)',
    'B2': 'Granted Patent (Previously published)',
    'P1': 'Plant Patent Application Publication',
    'P2': 'Plant Patent Grant',
    'P3': 'Plant Patent Application Publication',
    'P4': 'Plant Patent Grant (Previously published)',
    'P9': 'Corrected Plant Patent Application Publication',
    'H1': 'Statutory Invention Registration',
    'S1': 'Design Patent'
  };

  // If we have a kind code, use it
  if (kindCode && kindCodeMap[kindCode]) {
    return kindCodeMap[kindCode];
  }

  // Fall back to patent type if available
  if (patentType) {
    return `${patentType} Patent`;
  }

  return 'Status Unknown';
}

// Helper function to handle assignee information
function getAssigneeInfo(patent) {
  // Check for organization first
  if (patent.assignee_organization?.[0]) {
    return {
      company: patent.assignee_organization[0],
      type: 'Organization'
    };
  }
  
  // If no organization, check for individual inventor
  if (patent.assignee_first_name?.[0] || patent.assignee_last_name?.[0]) {
    const firstName = patent.assignee_first_name?.[0] || '';
    const lastName = patent.assignee_last_name?.[0] || '';
    return {
      company: `${firstName} ${lastName}`.trim(),
      type: 'Individual'
    };
  }
  
  // Default case if no assignee information is available
  return {
    company: 'Unassigned',
    type: 'Unknown'
  };
}
  //fcc submissions
  
  // More aggressive XML sanitization

  
  app.get('/api/fcc-submissions', async (req, res) => {
    try {
      const response = await axios.get('https://www.fcc.gov/news-events/daily-digest.xml', {
        timeout: 10000,
        maxRedirects: 3,
        headers: {
          'Accept': 'application/xml, application/rss+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; YourApp/1.0;)',
        },
        // Get response as raw text
        responseType: 'text',
        transformResponse: [data => data]
      });
  
      // Create parser with very lenient options
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        trimValues: true,
        parseTagValue: true,
        allowBooleanAttributes: true,
        ignoreDeclaration: true,
        ignorePiTags: true,
        removeNSPrefix: true,
        numberParseOptions: {
          skipLike: /./
        }
      });
  
      // Parse the XML
      const result = parser.parse(response.data);
      console.log(result)
      
      // Navigate through the parsed structure to find items
      const items = result?.rss?.channel?.item || [];
      const submissions = (Array.isArray(items) ? items : [items])
        .slice(0, 10)
        .map(item => ({
          title: (item.title || 'No Title').trim(),
          type: 'Daily Digest Entry',
          date: formatDate(item.pubDate || item['dc:date'] || new Date()),
          status: 'Published',
          id: item.guid || item.link || `fcc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          link: item.link || 'https://www.fcc.gov/rss/daily-digest.xml'
        }));
  console.log(submissions)
      res.json(submissions);
      
    } catch (error) {
      console.error('FCC Feed Error:', {
        message: error.message,
        stack: error.stack
      });
  
      // Return fallback data
      res.json([{
        title: 'FCC Daily Digest Feed Temporarily Unavailable',
        type: 'System Notice',
        date: new Date().toISOString(),
        status: 'Feed Error',
        id: `error-${Date.now()}`,
        link: 'https://www.fcc.gov/news-events/daily-digest'
      }]);
    }
  });
  
  function formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toString() === 'Invalid Date' ? 
        new Date().toISOString() : 
        date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }


// Company Data Enrichment
app.post('/api/enrich-company', async (req, res) => {
  const { companyName } = req.body;
  
  try {
    // Fetch additional company data from Apollo
    const apolloResponse = await axios.get(`https://api.apollo.io/v1/organizations/enrich`, {
      headers: {
        'X-API-KEY': process.env.APOLLO_API_KEY
      },
      params: {
        domain: companyName.toLowerCase().replace(/\s+/g, '') + '.com'
      }
    });

    // Get employee email patterns using Hunter.io
    const hunterResponse = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain: apolloResponse.data.domain,
        api_key: process.env.HUNTER_API_KEY
      }
    });

    const enrichedData = {
      companyInfo: apolloResponse.data,
      emailPatterns: hunterResponse.data.data.pattern
    };

    res.json(enrichedData);
  } catch (error) {
    console.error('Enrichment Error:', error);
    res.status(500).json({ error: 'Error enriching company data' });
  }
});

// Funding Rounds (using Crunchbase API)
// Fetch funding rounds from Crunchbase API
app.get('/api/funding-rounds', async (req, res) => {
  try {
    const { CRUNCHBASE_API_KEY } = process.env;

    if (!CRUNCHBASE_API_KEY) {
      return res.status(500).json({ error: 'Crunchbase API key is missing' });
    }

    const response = await axios.post(
      'https://api.crunchbase.com/api/v4/searches/organizations',
      {
        field_ids: [
          "identifier",
          "name",
          "short_description",
          // "funding/_total",
          // "categories",
          // "website",
          // "founded_on",
          "rank_org"
        ],
        query: [
          // {
          //   type: "predicate",
          //   field_id: "funding_total",
          //   operator_id: "gt",
          //   values: [0]
          // },
          {
            type: "predicate",
            field_id: "facet_ids",
            operator_id: "includes",
            values: [
              "company"
            ]
          }
        ],
        order: [
          {
            field_id: "rank_org",
            sort: "asc"  // Lower rank means more recent/important updates
          }
        ],
        limit: 10
      },
      {
        headers: { 
          'X-cb-user-key': CRUNCHBASE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const companies = response.data.entities.map(org => ({
      company: org.properties.name,
      description: org.properties.short_description || 'No description available',
      totalFunding: org.properties.funding_total
        ? `$${(org.properties.funding_total / 1000000).toFixed(1)}M`
        : 'Undisclosed',
      founded: org.properties.founded_on || 'Unknown',
      website: org.properties.website?.url || 'Not available',
      categories: org.properties.categories || [],
      rank: org.properties.rank_org,
      id: org.properties.identifier
    }));

    res.json(companies);
  } catch (error) {
    console.error('Crunchbase API Error:', error.response?.data || error);
    res.status(error.response?.status || 500).json({ 
      error: 'Error fetching company data'
    });
  }
});


// Export the app or start the server (depending on your use case)


// Campaign Analytics
const CampaignSchema = new mongoose.Schema({
  name: String,
  status: String,
  content: String,
  companies: [String],
  sent: Number,
  opened: Number,
  responded: Number,
  created: Date,
  lastModified: Date
});

const Campaign = mongoose.model('Campaign', CampaignSchema);

app.post('/api/campaigns', async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Error creating campaign' });
  }
});

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});


class SimilarWebAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.similarweb.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'api-key': this.apiKey
      }
    });
  }

  // General website metrics
  async getWebsiteMetrics(domain) {
    try {
      const response = await this.client.get(`/similar-rank/${domain}/rank`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Traffic and engagement metrics
  async getTrafficAndEngagement(domain) {
    try {
      const response = await this.client.get(`/website/${domain}/total-traffic-and-engagement/v1`, {
        params: {
          country: 'world',
          granularity: 'monthly',
          main_domain_only: false,
          format: 'json'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Traffic sources
  async getTrafficSources(domain) {
    try {
      const response = await this.client.get(`/website/${domain}/traffic-sources/v1`, {
        params: {
          country: 'world',
          main_domain_only: false,
          format: 'json'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Audience interests
  async getAudienceInterests(domain) {
    try {
      const response = await this.client.get(`/website/${domain}/audience-interests/v2`, {
        params: {
          country: 'world',
          format: 'json'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Geographic distribution
  async getGeographicDistribution(domain) {
    try {
      const response = await this.client.get(`/website/${domain}/geography/v2`, {
        params: {
          format: 'json'
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 403:
          throw new Error('API key invalid or expired');
        case 429:
          throw new Error('Rate limit exceeded');
        case 404:
          throw new Error('Domain not found');
        default:
          throw new Error(`API Error: ${error.response.data.message || 'Unknown error'}`);
      }
    }
    throw error;
  }
}

// Initialize SimilarWeb API client
const similarWeb = new SimilarWebAPI(process.env.SIMILARWEB_API_KEY);

// Cache for storing results
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Helper to check cache
const getCachedData = (key) => {
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
    cache.delete(key);
  }
  return null;
};

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Check cache first
    const cacheKey = `${domain}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, source: 'cache' });
    }

    // Fetch all metrics in parallel
    const [
      metrics,
      traffic,
      sources,
      interests,
      geography
    ] = await Promise.all([
      similarWeb.getWebsiteMetrics(domain),
      similarWeb.getTrafficAndEngagement(domain),
      similarWeb.getTrafficSources(domain),
      similarWeb.getAudienceInterests(domain),
      similarWeb.getGeographicDistribution(domain)
    ]);

    const result = {
      domain,
      metrics,
      traffic,
      sources,
      interests,
      geography,
      timestamp: new Date().toISOString()
    };

    // Cache the results
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json({ ...result, source: 'api' });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze domain',
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific metrics
app.get('/api/:metric/:domain', async (req, res) => {
  try {
    const { metric, domain } = req.params;
    
    let data;
    switch (metric) {
      case 'metrics':
        data = await similarWeb.getWebsiteMetrics(domain);
        break;
      case 'traffic':
        data = await similarWeb.getTrafficAndEngagement(domain);
        break;
      case 'sources':
        data = await similarWeb.getTrafficSources(domain);
        break;
      case 'interests':
        data = await similarWeb.getAudienceInterests(domain);
        break;
      case 'geography':
        data = await similarWeb.getGeographicDistribution(domain);
        break;
      default:
        return res.status(400).json({ error: 'Invalid metric requested' });
    }
    
    res.json({
      domain,
      metric,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching ${metric}:`, error);
    res.status(500).json({
      error: error.message || `Failed to fetch ${metric}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Function to manually trigger competitor analysis
async function analyzeCompetitor(domain) {
  try {
    const analysis = await Promise.all([
      similarWeb.getWebsiteMetrics(domain),
      similarWeb.getTrafficAndEngagement(domain),
      similarWeb.getTrafficSources(domain)
    ]);
    
    return {
      domain,
      metrics: analysis[0],
      traffic: analysis[1],
      sources: analysis[2],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error analyzing ${domain}:`, error);
    throw error;
  }
}


async function TwitterUserID() {
  const username = "romehmi_"; // Replace with the actual username
  const token = "AAAAAAAAAAAAAAAAAAAAANkstgEAAAAAU6TVbVxmf7riF%2BdmgGjHGnIhwIQ%3D6DIC0mE2nO3VLdPTEC2CeiL1Rc86tRtHitn1pEJ7vjyHFtnCiQ";      // Replace with your Bearer token
  
  const url = `https://api.x.com/2/users/by/username/${username}`;
  
  // Make the GET request
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      console.log("Response Data:", response.data.data.id);
      getTweets(response.data.data.id)
      return response.data.id
    })
    .catch((error) => {
      console.error("Error:", error.response ? error.response.data : error.message);
    });

}

async function getTweets(userId) {
  const token = "AAAAAAAAAAAAAAAAAAAAANkstgEAAAAAU6TVbVxmf7riF%2BdmgGjHGnIhwIQ%3D6DIC0mE2nO3VLdPTEC2CeiL1Rc86tRtHitn1pEJ7vjyHFtnCiQ";      // Replace with your Bearer token
const url = `https://api.x.com/2/users/${userId}/tweets`;


  axios
  .get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  .then((response) => {
    console.log("Response Data:", response.data);
  })
  .catch((error) => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });


}

// You'll need to replace these with your actual API credentials
const API_KEY = 'tOYGdLGrrBQhMdJ2Zy1iqkexS';
const API_SECRET_KEY = 'PPjOpxQkZVXVXDdfoitaYTadFx2MzjPUzekuskrFYA36JC28x1';
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANkstgEAAAAAU6TVbVxmf7riF%2BdmgGjHGnIhwIQ%3D6DIC0mE2nO3VLdPTEC2CeiL1Rc86tRtHitn1pEJ7vjyHFtnCiQ';

// The company's username (without @)
const USERNAME = 'romehmi_';

async function getCompanyTweets() {
    try {
        const response = await fetch(`https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${USERNAME}&count=100&tweet_mode=extended`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tweets = await response.json();
        
        // Process and display tweets
        // const tweetContainer = document.getElementById('tweet-container');
        // tweetContainer.innerHTML = '';

        tweets.forEach(tweet => {

          console.log(tweet)
            // const tweetElement = document.createElement('div');
            // tweetElement.className = 'tweet-card border border-gray-200 rounded-lg p-4 mb-4 shadow-sm';
            
            // const tweetContent = `
            //     <div class="flex items-start space-x-3">
            //         <img src="${tweet.user.profile_image_url}" alt="Profile" class="w-12 h-12 rounded-full">
            //         <div class="flex-1">
            //             <div class="flex items-center space-x-2">
            //                 <span class="font-bold">${tweet.user.name}</span>
            //                 <span class="text-gray-500">@${tweet.user.screen_name}</span>
            //             </div>
            //             <p class="mt-1">${tweet.full_text}</p>
            //             <div class="mt-2 text-gray-500 text-sm">
            //                 ${new Date(tweet.created_at).toLocaleDateString()}
            //             </div>
            //             <div class="mt-2 flex space-x-4 text-gray-500">
            //                 <span>${tweet.retweet_count} Retweets</span>
            //                 <span>${tweet.favorite_count} Likes</span>
            //             </div>
            //         </div>
            //     </div>
            // `;
            
            // tweetElement.innerHTML = tweetContent;
            // tweetContainer.appendChild(tweetElement);
        });

    } catch (error) {
        console.error('Error fetching tweets:', error);
        // document.getElementById('tweet-container').innerHTML = `
        //     <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        //         Error fetching tweets. Please check your API credentials and try again.
        //     </div>
        // `;
    }
}

// Add this HTML to your page:
// <div id="tweet-container"></div>

// Call the function when needed



class EdgarYahooReport {
  constructor(apiKey) {
    this.secBaseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
    this.yahooFinanceUrl = 'https://finance.yahoo.com';
    this.apiKey = apiKey;
  }

  async fetchCompanyData(cik) {
    const url = `${this.secBaseUrl}/CIK${String(cik).padStart(10, '0')}.json`;
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Company Analysis Tool' },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching SEC data for CIK ${cik}:`, error.message);
      return null;
    }
  }

  async fetchStockData(ticker) {
    try {
      const data = await yahooFinance.quote(ticker);
      return {
        marketCap: data.marketCap,
        stockPrice: data.regularMarketPrice,
        outstandingShares: data.sharesOutstanding,
      };
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ticker ${ticker}:`, error.message);
      return null;
    }
  }

  extractMetrics(data) {
    const extractValue = (concept) => {
      const values = data.facts?.['us-gaap']?.[concept]?.units?.USD;
      if (!values?.length) return null;
      const sorted = [...values].sort((a, b) => new Date(b.end) - new Date(a.end));
      return {
        current: sorted[0].val,
        previous: sorted[1]?.val,
        growth: sorted[1] ? ((sorted[0].val - sorted[1].val) / sorted[1].val) * 100 : null,
      };
    };

    return {
      revenue: extractValue('Revenues'),
      netIncome: extractValue('NetIncomeLoss'),
      rAndD: extractValue('ResearchAndDevelopmentExpense'),
      marketing: extractValue('SellingAndMarketingExpense'),
      operatingExpenses: extractValue('OperatingExpenses'),
      totalAssets: extractValue('Assets'),
      totalLiabilities: extractValue('Liabilities'),
    };
  }

  calculateDebtToEquity(totalLiabilities, totalAssets) {
    return totalLiabilities && totalAssets
      ? (totalLiabilities / totalAssets).toFixed(2)
      : 'N/A';
  }

  async generateReport(cik, ticker) {
    const companyData = await this.fetchCompanyData(cik);
    const stockData = await this.fetchStockData(ticker);

    if (!companyData || !stockData) {
      console.error('Failed to fetch required data for report.');
      return;
    }

    const metrics = this.extractMetrics(companyData);
    const debtToEquity = this.calculateDebtToEquity(
      metrics.totalLiabilities?.current,
      metrics.totalAssets?.current
    );

    const report = {
      company: {
        cik,
        ticker,
        marketCap: `$${(stockData.marketCap / 1e9).toFixed(2)}B`,
      },
      financials: {
        revenue: `$${(metrics.revenue?.current / 1e9).toFixed(2)}B`,
        revenueGrowth: `${metrics.revenue?.growth?.toFixed(2)}%`,
        netIncome: `$${(metrics.netIncome?.current / 1e9).toFixed(2)}B`,
        netIncomeGrowth: `${metrics.netIncome?.growth?.toFixed(2)}%`,
      },
      expenses: {
        rAndD: `$${(metrics.rAndD?.current / 1e6).toFixed(2)}M`,
        marketing: `$${(metrics.marketing?.current / 1e6).toFixed(2)}M`,
        operatingExpenses: `$${(metrics.operatingExpenses?.current / 1e6).toFixed(2)}M`,
      },
      financialPosition: {
        debtToEquity,
        totalAssets: `$${(metrics.totalAssets?.current / 1e9).toFixed(2)}B`,
        totalLiabilities: `$${(metrics.totalLiabilities?.current / 1e9).toFixed(2)}B`,
      },
    };

    await fs.writeFile(
      `./sec_data/report_${cik}.json`,
      JSON.stringify(report, null, 2)
    );
    console.log(`Report generated for CIK ${cik} and saved to file.`);
    return report;
  }
}


// const axios = require('axios');
// const yahooFinance = require('yahoo-finance2').default;
// const fs = require('fs').promises;

class ComprehensiveReport {
  constructor(secApiKey, usptoApiKey) {
    this.secBaseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
    this.usptoBaseUrl = 'https://developer.uspto.gov/ibd-api/v1';
    this.secApiKey = secApiKey;
    this.usptoApiKey = usptoApiKey;
  }

  // Fetch SEC Data
  async fetchSECData(cik) {
    const url = `${this.secBaseUrl}/CIK${String(cik).padStart(10, '0')}.json`;
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Comprehensive Analysis Tool' },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching SEC data for CIK ${cik}:`, error.message);
      return null;
    }
  }

  // Fetch Yahoo Finance Data
  async fetchStockData(ticker) {
    try {
      const data = await yahooFinance.quote(ticker);
      return data;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ticker ${ticker}:`, error.message);
      return null;
    }
  }

  // Fetch USPTO Patent Data
  async fetchPatentData(companyName) {
    const url = `${this.usptoBaseUrl}/patent/application?searchText=${encodeURIComponent(companyName)}`;
    try {
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${this.usptoApiKey}` },
      });
      return response.data.results;
    } catch (error) {
      console.error(`Error fetching USPTO data for company ${companyName}:`, error.message);
      return [];
    }
  }

  // Extract Partnership Data
  extractPartnershipData(secData) {
    const filings = secData.facts?.['us-gaap']?.['DocumentAndEntityInformation'];
    const keywords = ['partnership', 'collaboration', 'joint venture'];
    const partnerships = [];

    if (filings) {
      Object.values(filings).forEach((filing) => {
        if (keywords.some((keyword) => filing?.description?.toLowerCase().includes(keyword))) {
          partnerships.push(filing.description);
        }
      });
    }

    return partnerships;
  }

  // Generate Report
  async generateReport(cik, ticker, companyName) {
    const secData = await this.fetchSECData(cik);
    const stockData = await this.fetchStockData(ticker);
    const patentData = await this.fetchPatentData(companyName);

    if (!secData || !stockData) {
      console.error('Failed to fetch required data for report.');
      return;
    }

    const marketingMetrics = this.extractMarketingMetrics(secData);
    const revenue = marketingMetrics.revenue?.current;
    const partnerships = this.extractPartnershipData(secData);

    const report = {
      company: {
        cik,
        ticker,
        name: companyName,
        marketCap: `$${(stockData.marketCap / 1e9).toFixed(2)}B`,
      },
      financials: {
        revenue: `$${(revenue / 1e9).toFixed(2)}B`,
        revenueGrowth: `${marketingMetrics.revenue?.growth?.toFixed(2)}% YoY`,
        advertisingExpense: `$${(marketingMetrics.advertisingExpense?.current / 1e6).toFixed(2)}M`,
        marketingExpense: `$${(marketingMetrics.marketingExpense?.current / 1e6).toFixed(2)}M`,
        rAndDExpense: `$${(marketingMetrics.technologyExpense?.current / 1e6).toFixed(2)}M`,
      },
      marketing: {
        customerAcquisitionCost: `$${(revenue / (marketingMetrics.marketingExpense?.current || 1)).toFixed(2)}`,
        romi: `${((revenue - marketingMetrics.marketingExpense?.current) / (marketingMetrics.marketingExpense?.current || 1) * 100).toFixed(2)}%`,
      },
      partnerships,
      patents: {
        totalPatents: patentData.length,
        recentPatents: patentData.slice(0, 5).map((patent) => ({
          title: patent.title,
          applicationDate: patent.application_date,
        })),
      },
    };

    await fs.writeFile(`./sec_data/company_report_${cik}.json`, JSON.stringify(report, null, 2));
    console.log(`Report generated for ${companyName} and saved to file.`);
    return report;
  }

  extractMarketingMetrics(data) {
    const extractValue = (concept) => {
      const values = data.facts?.['us-gaap']?.[concept]?.units?.USD;
      if (!values?.length) return null;
      const sorted = [...values].sort((a, b) => new Date(b.end) - new Date(a.end));
      return {
        current: sorted[0].val,
        previous: sorted[1]?.val,
        growth: sorted[1] ? ((sorted[0].val - sorted[1].val) / sorted[1].val) * 100 : null,
      };
    };

    return {
      revenue: extractValue('Revenues'),
      advertisingExpense: extractValue('AdvertisingExpense'),
      marketingExpense: extractValue('SellingAndMarketingExpense'),
      technologyExpense: extractValue('TechnologyExpense'),
    };
  }
}




async function fetchPatentData(companyName) {
  const url = 'https://api.patentsview.org/patents/query';
  const requestBody = {
    q: {
      _and: [
        {
          _gte: {
            patent_date: "2024-01-01",
          }
        },
        {
          assignee_organization: companyName
        }
      ]
    },
    f: [
      "patent_number", "patent_title", "patent_date", "patent_type",
      "patent_kind", "assignee_organization", "citedby_patent_number"
    ],
    o: { "patent_date": "desc" },
    per_page: 100
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.patents.map(patent => ({
      title: patent.patent_title,
      number: patent.patent_number,
      issueDate: patent.patent_date,
      type: patent.patent_type,
      organization: patent.assignee_organization,
      citations: patent.citedby_patent_number?.length || 0
    }));
  } catch (error) {
    console.error('Error fetching patent data:', error.response?.data || error.message);
    return [];
  }
}

// Function to fetch FDA filings
async function fetchFDAFilings() {
  try {
    const response = await axios.get('https://api.fda.gov/drug/drugsfda.json', {
      params: {
        api_key: process.env.FDA_API_KEY,
        limit: 20,
        sort: 'submissions.submission_status_date:desc'
      }
    });
    return response.data.results.map(filing => ({
      company: filing.sponsor_name,
      type: filing.submissions[0]?.submission_type || 'N/A',
      date: filing.submissions[0]?.submission_status_date || 'N/A',
      status: filing.submissions[0]?.submission_status || 'Pending',
      applicationNumber: filing.application_number
    }));
  } catch (error) {
    console.error('Error fetching FDA filings:', error.response?.data || error.message);
    return [];
  }
}

// Function to fetch Crunchbase company data
async function fetchCrunchbaseData() {
  try {
    const response = await axios.post(
      'https://api.crunchbase.com/api/v4/searches/organizations',
      {
        field_ids: ["identifier", "name", "short_description", "rank_org"],
        query: [
          {
            type: "predicate",
            field_id: "facet_ids",
            operator_id: "includes",
            values: ["company"]
          }
        ],
        order: [
          {
            field_id: "rank_org",
            sort: "asc"
          }
        ],
        limit: 10
      },
      {
        headers: {
          'X-cb-user-key': process.env.CRUNCHBASE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.entities.map(org => ({
      company: org.properties.name,
      description: org.properties.short_description || 'No description available',
      rank: org.properties.rank_org
    }));
  } catch (error) {
    console.error('Error fetching Crunchbase data:', error.response?.data || error.message);
    return [];
  }
}

// Function to fetch News data
async function fetchNewsData(companyName) {
  const url = `https://newsapi.org/v2/everything`;
  try {
    const response = await axios.get(url, {
      params: {
        apiKey: process.env.NEWS_API_KEY,
        q: companyName,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 5
      }
    });
    return response.data.articles.map(article => ({
      title: article.title,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url
    }));
  } catch (error) {
    console.error('Error fetching news data:', error.response?.data || error.message);
    return [];
  }
}

// Function to generate the enriched report
async function generateReport(companyName) {
  try {
    const [patentData, fdaFilings, crunchbaseData, newsData] = await Promise.all([
      fetchPatentData(companyName),
      fetchFDAFilings(),
      fetchCrunchbaseData(),
      fetchNewsData(companyName)
    ]);

    const report = {
      companyName,
      patents: patentData,
      fdaFilings,
      marketData: crunchbaseData,
      recentNews: newsData
    };

    // console.log('Generated Report:', JSON.stringify(report, null, 2));
    await fs.writeFile(`./sec_data/company_reportn_${companyName}.json`, JSON.stringify(report, null, 2));
    console.log(`Report generated for ${companyName} and saved to file.`);
    return report;
  } catch (error) {
    console.error('Error generating report:', error.message);
    throw error;
  }
}

// Example Usage
class EnhancedMarketReport {
  constructor(secApiKey, usptoApiKey) {
    this.secBaseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
    this.usptoBaseUrl = 'https://developer.uspto.gov/ibd-api/v1';
    this.secApiKey = secApiKey;
    this.usptoApiKey = usptoApiKey;
    this.yahooFinance = require('yahoo-finance2').default;
  }

  async fetchSECData(cik) {
    const url = `${this.secBaseUrl}/CIK${String(cik).padStart(10, '0')}.json`;
    try {
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': 'Market Intelligence Tool',
          'Authorization': `Bearer ${this.secApiKey}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching SEC data: ${error.message}`);
      return null;
    }
  }

  async fetchStockData(ticker) {
    try {
      const data = await this.yahooFinance.quote(ticker);
      return {
        marketCap: data.marketCap,
        price: data.regularMarketPrice,
        volume: data.regularMarketVolume,
        peRatio: data.regularMarketPrice / data.epsTrailingTwelveMonths,
        beta: data.beta
      };
    } catch (error) {
      console.error(`Error fetching stock data for ${ticker}:`, error.message);
      return null;
    }
  }

  async fetchCompetitorData(competitors) {
    return Promise.all(
      competitors.map(async (comp) => {
        const secData = await this.fetchSECData(comp.cik);
        const stockData = await this.fetchStockData(comp.ticker);
        return { 
          name: comp.name,
          metrics: this.extractCompetitorMetrics(secData, stockData)
        };
      })
    );
  }

  calculateTrend(values) {
    if (!values || values.length < 2) return 'insufficient data';
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(((values[i] - values[i-1]) / values[i-1]) * 100);
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    if (avgChange > 10) return 'strong growth';
    if (avgChange > 0) return 'moderate growth';
    if (avgChange > -10) return 'moderate decline';
    return 'strong decline';
  }

  calculateMarketShare(revenue, marketCap) {
    if (!revenue || !marketCap) return null;
    return (revenue / marketCap) * 100;
  }

  calculateRAndDIntensity(rAndD, revenue) {
    if (!rAndD || !revenue) return null;
    return (rAndD / revenue) * 100;
  }

  calculateProfitMargin(netIncome, revenue) {
    if (!netIncome || !revenue) return null;
    return (netIncome / revenue) * 100;
  }

  calculateMarketingEfficiency(revenue, marketingExpense) {
    if (!revenue || !marketingExpense) return null;
    return revenue / marketingExpense;
  }

  calculateCAC(marketingExpense, customerCount) {
    if (!marketingExpense || !customerCount) return null;
    return marketingExpense / customerCount;
  }

  calculateProductivity(revenue, employeeCount) {
    if (!revenue || !employeeCount) return null;
    return revenue / employeeCount;
  }

  calculateOperatingEfficiency(opEx, revenue) {
    if (!opEx || !revenue) return null;
    return (opEx / revenue) * 100;
  }

  calculateHerfindahlIndex(competitors) {
    if (!competitors || !competitors.length) return null;
    const totalMarket = competitors.reduce((sum, comp) => sum + (comp.metrics?.financials?.revenue?.current || 0), 0);
    return competitors.reduce((sum, comp) => {
      const marketShare = ((comp.metrics?.financials?.revenue?.current || 0) / totalMarket) * 100;
      return sum + (marketShare * marketShare);
    }, 0);
  }

  identifyMarketLeader(competitors) {
    if (!competitors || !competitors.length) return null;
    return competitors.reduce((leader, comp) => {
      if (!leader || (comp.metrics?.financials?.revenue?.current || 0) > (leader.metrics?.financials?.revenue?.current || 0)) {
        return comp;
      }
      return leader;
    });
  }

  analyzeGrowthTrends(competitors) {
    return competitors.map(comp => ({
      name: comp.name,
      revenueGrowth: comp.metrics?.financials?.revenue?.growth || 0,
      profitGrowth: comp.metrics?.financials?.profitMargin || 0
    }));
  }

  compareMarketingEfficiency(competitors) {
    return competitors.map(comp => ({
      name: comp.name,
      efficiency: comp.metrics?.marketingMetrics?.marketingEfficiency || 0,
      cac: comp.metrics?.marketingMetrics?.customerAcquisitionTrend || 0
    }));
  }

  extractDetailedMetrics(data) {
    const extractValue = (concept) => {
      const values = data.facts?.['us-gaap']?.[concept]?.units?.USD;
      if (!values?.length) return null;
      const sorted = [...values].sort((a, b) => new Date(b.end) - new Date(a.end));
      return {
        current: sorted[0].val,
        previous: sorted[1]?.val,
        growth: sorted[1] ? ((sorted[0].val - sorted[1].val) / sorted[1].val) * 100 : null,
        trend: this.calculateTrend(sorted.slice(0, 4).map(v => v.val))
      };
    };

    return {
      revenue: extractValue('Revenues'),
      netIncome: extractValue('NetIncomeLoss'),
      rAndD: extractValue('ResearchAndDevelopmentExpense'),
      marketingExpense: extractValue('SellingAndMarketingExpense'),
      operatingExpenses: extractValue('OperatingExpenses'),
      employeeCount: this.extractEmployeeCount(data),
      customerBase: this.extractCustomerMetrics(data),
      segmentData: this.extractSegmentData(data),
      geographicData: this.extractGeographicData(data)
    };
  }

  extractEmployeeCount(data) {
    const employeeInfo = data.facts?.['dei']?.['EntityCommonStockSharesOutstanding']?.units?.shares?.[0];
    return employeeInfo ? employeeInfo.val : null;
  }

  extractCustomerMetrics(data) {
    // This is a placeholder - actual implementation would depend on specific SEC filing formats
    return {
      current: null,
      previous: null,
      growth: null
    };
  }

  extractCompetitorMetrics(secData, stockData) {
    const metrics = this.extractDetailedMetrics(secData);
    return {
      financials: {
        revenue: metrics.revenue,
        marketShare: this.calculateMarketShare(metrics.revenue?.current, stockData?.marketCap),
        rAndDIntensity: this.calculateRAndDIntensity(metrics.rAndD?.current, metrics.revenue?.current),
        profitMargin: this.calculateProfitMargin(metrics.netIncome?.current, metrics.revenue?.current)
      },
      marketingMetrics: {
        marketingEfficiency: this.calculateMarketingEfficiency(
          metrics.revenue?.current,
          metrics.marketingExpense?.current
        ),
        customerAcquisitionTrend: this.calculateCAC(
          metrics.marketingExpense?.current,
          metrics.customerBase?.current
        )
      },
      operationalMetrics: {
        employeeProductivity: this.calculateProductivity(
          metrics.revenue?.current,
          metrics.employeeCount?.current
        ),
        operatingEfficiency: this.calculateOperatingEfficiency(
          metrics.operatingExpenses?.current,
          metrics.revenue?.current
        )
      }
    };
  }

  extractSegmentData(data) {
    const segments = data.facts?.['us-gaap']?.['SegmentInformation'];
    if (!segments) return null;
    
    return Object.values(segments).reduce((acc, segment) => {
      if (segment.description) {
        acc.push({
          name: segment.description,
          revenue: segment.val,
          date: segment.end
        });
      }
      return acc;
    }, []);
  }

  extractGeographicData(data) {
    const geoData = data.facts?.['us-gaap']?.['GeographicAreaInformation'];
    if (!geoData) return null;

    return Object.values(geoData).reduce((acc, region) => {
      if (region.description) {
        acc.push({
          region: region.description,
          revenue: region.val,
          date: region.end
        });
      }
      return acc;
    }, []);
  }

  generateSWOTAnalysis(mainData, competitors) {
    const metrics = this.extractDetailedMetrics(mainData);
    const avgCompetitorRevenue = competitors.reduce((sum, comp) => 
      sum + (comp.metrics?.financials?.revenue?.current || 0), 0) / competitors.length;

    return {
      strengths: this.identifyStrengths(metrics, avgCompetitorRevenue),
      weaknesses: this.identifyWeaknesses(metrics, avgCompetitorRevenue),
      opportunities: this.identifyOpportunities(metrics, competitors),
      threats: this.identifyThreats(metrics, competitors)
    };
  }

  identifyStrengths(metrics, avgCompetitorRevenue) {
    const strengths = [];
    if (metrics.revenue?.current > avgCompetitorRevenue) {
      strengths.push('Market leader in revenue');
    }
    if (metrics.revenue?.growth > 10) {
      strengths.push('Strong revenue growth');
    }
    return strengths;
  }

  identifyWeaknesses(metrics, avgCompetitorRevenue) {
    const weaknesses = [];
    if (metrics.revenue?.current < avgCompetitorRevenue) {
      weaknesses.push('Below average market share');
    }
    if (metrics.operatingExpenses?.growth > metrics.revenue?.growth) {
      weaknesses.push('Rising operational costs');
    }
    return weaknesses;
  }

  identifyOpportunities(metrics, competitors) {
    const opportunities = [];
    const unservedMarkets = this.findUnservedMarkets(metrics.geographicData, competitors);
    if (unservedMarkets.length) {
      opportunities.push(`Potential expansion into: ${unservedMarkets.join(', ')}`);
    }
    return opportunities;
  }

  identifyThreats(metrics, competitors) {
    const threats = [];
    const fastGrowingCompetitors = competitors.filter(comp => 
      (comp.metrics?.financials?.revenue?.growth || 0) > (metrics.revenue?.growth || 0)
    );
    if (fastGrowingCompetitors.length) {
      threats.push(`Fast-growing competitors: ${fastGrowingCompetitors.map(c => c.name).join(', ')}`);
    }
    return threats;
  }

  findUnservedMarkets(geographicData, competitors) {
    const servedMarkets = new Set(geographicData?.map(g => g.region) || []);
    const potentialMarkets = new Set(['North America', 'Europe', 'Asia', 'South America', 'Africa']);
    return Array.from(potentialMarkets).filter(market => !servedMarkets.has(market));
  }

  async generateEnhancedReport(mainCompany, competitors) {
    const [
      mainData,
      competitorData,
      patentData,
      fdaFilings,
      newsData,
      stockPriceHistory
    ] = await Promise.all([
      this.fetchSECData(mainCompany.cik),
      this.fetchCompetitorData(competitors),
      this.fetchPatentData(mainCompany.name),
      this.fetchFDAFilings(mainCompany.name),
      this.fetchNewsData(mainCompany.name),
      this.fetchStockPriceHistory(mainCompany.ticker)
    ]);

    const marketTrends = {
      marketConcentration: this.calculateHerfindahlIndex(competitorData),
      marketLeader: this.identifyMarketLeader(competitorData),
      growthTrends: this.analyzeGrowthTrends(competitorData),
      marketingEfficiency: this.compareMarketingEfficiency(competitorData)
    };

    const report = {
      companyOverview: {
        ...this.extractCompetitorMetrics(mainData, await this.fetchStockData(mainCompany.ticker)),
        marketPosition: this.calculateMarketPosition(mainData, competitorData),
        stockPrice: {
          current: stockPriceHistory[stockPriceHistory.length - 1],
          history: stockPriceHistory,
          volatility: this.calculateVolatility(stockPriceHistory),
          technicalIndicators: this.calculateTechnicalIndicators(stockPriceHistory)
        }
      },
      intellectualProperty: {
        patents: patentData ? {
          recent: patentData.slice(0, 10),
          total: patentData.length,
          byType: this.groupPatentsByType(patentData)
        } : { recent: [], total: 0, byType: {} },
        fdaFilings: fdaFilings ? {
          recent: fdaFilings.slice(0, 5),
          total: fdaFilings.length,
          byStatus: this.groupFDAFilingsByStatus(fdaFilings)
        } : { recent: [], total: 0, byStatus: {} }
      },
      recentNews: {
        articles: newsData.map(article => ({
          title: article.title,
          source: article.source.name,
          date: article.publishedAt,
          url: article.url,
          sentiment: this.analyzeSentiment(article.title)
        })),
        sentimentSummary: this.calculateNewsSentiment(newsData)
      },
      competitiveAnalysis: {
        marketTrends,
        competitorComparison: competitorData,
        swotAnalysis: this.generateSWOTAnalysis(mainData, competitorData)
      },
      marketingIntelligence: {
        channelEffectiveness: this.analyzeMarketingChannels(mainData),
        customerSegments: this.analyzeCustomerSegments(mainData),
        geographicPresence: this.analyzeGeographicPresence(mainData)
      },
      recommendations: this.generateRecommendations(mainData, competitorData, marketTrends)
    };

    await fs.writeFile(
      `./enhanced_report_${mainCompany.cik}.json`,
      JSON.stringify(report, null, 2)
    );

    return report;
  }

  calculateMarketPosition(mainData, competitors) {
    const metrics = this.extractDetailedMetrics(mainData);
    const totalMarket = competitors.reduce((sum, comp) => 
      sum + (comp.metrics?.financials?.revenue?.current || 0), 0) + (metrics.revenue?.current || 0);
    
    return {
      marketShare: ((metrics.revenue?.current || 0) / totalMarket) * 100,
      relativeGrowth: this.compareGrowthRates(metrics.revenue?.growth, competitors),
      competitivePosition: this.assessCompetitivePosition(metrics, competitors)
    };
  }

  compareGrowthRates(mainGrowth, competitors) {
    const avgCompetitorGrowth = competitors.reduce((sum, comp) => 
      sum + (comp.metrics?.financials?.revenue?.growth || 0), 0) / competitors.length;
    return {
      differential: mainGrowth - avgCompetitorGrowth,
      percentile: this.calculatePercentile(mainGrowth, competitors.map(c => 
        c.metrics?.financials?.revenue?.growth || 0))
    };
  }

  calculatePercentile(value, array) {
    const sorted = [...array].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return (index / sorted.length) * 100;
  }

  assessCompetitivePosition(metrics, competitors) {
    const marketShare = this.calculateMarketShare(metrics.revenue?.current, 
      competitors.reduce((sum, comp) => sum + (comp.metrics?.financials?.revenue?.current || 0), 0));
    const growthRate = metrics.revenue?.growth;
    
    if (marketShare > 30 && growthRate > 10) return 'Market Leader';
    if (marketShare > 20 && growthRate > 5) return 'Strong Competitor';
    if (marketShare > 10) return 'Established Player';
    if (growthRate > 15) return 'Fast-Growing Challenger';
    return 'Market Follower';
  }

  analyzeMarketingChannels(data) {
    const metrics = this.extractDetailedMetrics(data);
    return {
      efficiency: this.calculateMarketingEfficiency(
        metrics.revenue?.current,
        metrics.marketingExpense?.current
      ),
      trends: this.analyzeTrends(metrics.marketingExpense),
      recommendations: this.generateChannelRecommendations(metrics)
    };
  }

  analyzeTrends(metric) {
    if (!metric?.current || !metric?.previous) return 'Insufficient data';
    const growth = ((metric.current - metric.previous) / metric.previous) * 100;
    return {
      trend: growth > 0 ? 'Increasing' : 'Decreasing',
      magnitude: Math.abs(growth).toFixed(2) + '%'
    };
  }

  analyzeCustomerSegments(data) {
    const segments = this.extractSegmentData(data);
    if (!segments) return null;

    return segments.map(segment => ({
      name: segment.name,
      revenue: segment.revenue,
      growth: this.calculateSegmentGrowth(segment, data),
      profitability: this.calculateSegmentProfitability(segment, data)
    }));
  }

  calculateSegmentGrowth(segment, data) {
    const previousYearData = data.facts?.['us-gaap']?.['SegmentInformation']?.units?.USD?.find(
      entry => entry.description === segment.name && 
               new Date(entry.end).getFullYear() === new Date(segment.date).getFullYear() - 1
    );
    
    if (!previousYearData) return null;
    return ((segment.revenue - previousYearData.val) / previousYearData.val * 100).toFixed(2);
  }

  calculateSegmentProfitability(segment, data) {
    const segmentExpense = data.facts?.['us-gaap']?.['SegmentExpense']?.units?.USD?.find(
      entry => entry.description === segment.name && entry.end === segment.date
    );
    
    if (!segmentExpense) return null;
    return ((segment.revenue - segmentExpense.val) / segment.revenue * 100).toFixed(2);
  }

  async fetchMarketData(region) {
    try {
      const response = await axios.get(`https://api.worldbank.org/v2/country/${region}/indicator/NY.GDP.MKTP.CD?format=json`);
      return response.data[1][0].value;
    } catch (error) {
      console.error(`Error fetching market data for ${region}:`, error);
      return null;
    }
  }

  analyzeGeographicPresence(data) {
    const geoData = this.extractGeographicData(data);
    if (!geoData) return null;

    return Promise.all(geoData.map(async region => {
      const marketSize = await this.fetchMarketData(region.region);
      const penetration = this.calculateMarketPenetration(region, marketSize);
      const potential = this.assessGrowthPotential(region, marketSize, penetration);

      return {
        region: region.region,
        revenue: region.revenue,
        marketPenetration: penetration,
        growthPotential: potential,
        marketSize: marketSize,
        yoyGrowth: this.calculateRegionalGrowth(region, data)
      };
    }));
  }

  calculateMarketPenetration(region, marketSize) {
    if (!marketSize) return null;
    return ((region.revenue / marketSize) * 100).toFixed(2);
  }

  assessGrowthPotential(region, marketSize, penetration) {
    if (!marketSize || !penetration) return 'Unknown';
    
    const penetrationRate = parseFloat(penetration);
    if (penetrationRate < 5) return 'High';
    if (penetrationRate < 15) return 'Medium';
    return 'Low';
  }

  calculateRegionalGrowth(region, data) {
    const previousYear = data.facts?.['us-gaap']?.['GeographicAreaInformation']?.units?.USD?.find(
      entry => entry.description === region.region && 
               new Date(entry.end).getFullYear() === new Date(region.date).getFullYear() - 1
    );
    
    if (!previousYear) return null;
    return ((region.revenue - previousYear.val) / previousYear.val * 100).toFixed(2);
  }

  async fetchPatentData(companyName) {
    const url = 'https://api.patentsview.org/patents/query';
    const requestBody = {
      q: {
        _and: [
          { _gte: { patent_date: "2024-01-01" } },
          { assignee_organization: companyName }
        ]
      },
      f: ["patent_number", "patent_title", "patent_date", "patent_type", "citedby_patent_number"],
      o: { "patent_date": "desc" }
    };

    try {
      const response = await axios.post(url, requestBody);
      return response.data.patents;
    } catch (error) {
      console.error('Error fetching patent data:', error);
      return [];
    }
  }

  async fetchFDAFilings(companyName) {
    try {
      const response = await axios.get('https://api.fda.gov/drug/drugsfda.json', {
        params: {
          search: `sponsor_name:"${companyName}"`,
          limit: 10
        }
      });
      return response.data.results;
    } catch (error) {
      console.error('Error fetching FDA filings:', error);
      return [];
    }
  }

  async fetchNewsData(companyName) {
    try {
      const response = await axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: companyName,
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: 5
        },
        headers: {
          'X-Api-Key': process.env.NEWS_API_KEY
        }
      });
      return response.data.articles;
    } catch (error) {
      console.error('Error fetching news data:', error);
      return [];
    }
  }

  async fetchStockPriceHistory(ticker) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      
      const data = await this.yahooFinance.historical(ticker, {
        period1: startDate,
        period2: endDate
      });
      
      return data.map(day => ({
        date: day.date,
        close: day.close,
        volume: day.volume,
        high: day.high,
        low: day.low
      }));
    } catch (error) {
      console.error('Error fetching stock price history:', error);
      return [];
    }
  }

  generateChannelRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.marketingExpense?.growth > metrics.revenue?.growth) {
      recommendations.push('Optimize marketing spend efficiency');
    }
    if (metrics.revenue?.growth < 5) {
      recommendations.push('Explore new marketing channels');
    }
    
    return recommendations;
  }

  generateRecommendations(mainData, competitorData, marketTrends) {
    const metrics = this.extractDetailedMetrics(mainData);
    const recommendations = [];

    // Market Position Recommendations
    if (metrics.revenue?.growth < marketTrends.marketLeader?.metrics?.financials?.revenue?.growth) {
      recommendations.push({
        area: 'Market Position',
        recommendation: 'Increase market share through aggressive growth strategies',
        rationale: 'Currently growing slower than market leader'
      });
    }

    // Operational Efficiency
    if (metrics.operatingExpenses?.growth > metrics.revenue?.growth) {
      recommendations.push({
        area: 'Operations',
        recommendation: 'Implement cost optimization measures',
        rationale: 'Operating expenses growing faster than revenue'
      });
    }

    // Marketing Strategy
    const marketingEfficiency = this.calculateMarketingEfficiency(
      metrics.revenue?.current,
      metrics.marketingExpense?.current
    );
    if (marketingEfficiency < 5) {
      recommendations.push({
        area: 'Marketing',
        recommendation: 'Review and optimize marketing channels',
        rationale: 'Low marketing ROI compared to industry standards'
      });
    }

    return recommendations;
  }

  calculateVolatility(priceHistory) {
    if (!priceHistory.length) return null;
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      returns.push(Math.log(priceHistory[i].close / priceHistory[i-1].close));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  calculateTechnicalIndicators(priceHistory) {
    return {
      sma20: this.calculateSMA(priceHistory, 20),
      sma50: this.calculateSMA(priceHistory, 50),
      rsi: this.calculateRSI(priceHistory),
      macd: this.calculateMACD(priceHistory)
    };
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
      sma.push({
        date: prices[i].date,
        value: sum / period
      });
    }
    return sma;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period) return null;
    let gains = 0;
    let losses = 0;
    const rsi = [];

    // Calculate initial RSI
    for (let i = 1; i < period; i++) {
      const change = prices[i].close - prices[i-1].close;
      if (change >= 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for remaining periods
    for (let i = period; i < prices.length; i++) {
      const change = prices[i].close - prices[i-1].close;
      avgGain = ((avgGain * 13) + (change > 0 ? change : 0)) / period;
      avgLoss = ((avgLoss * 13) + (change < 0 ? -change : 0)) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push({
        date: prices[i].date,
        value: 100 - (100 / (1 + rs))
      });
    }
    return rsi;
  }

  calculateMACD(prices, short = 12, long = 26, signal = 9) {
    const shortEMA = this.calculateEMA(prices.map(p => p.close), short);
    const longEMA = this.calculateEMA(prices.map(p => p.close), long);
    const macdLine = shortEMA.map((val, i) => val - longEMA[i]);
    const signalLine = this.calculateEMA(macdLine, signal);
    
    return prices.slice(long - 1).map((price, i) => ({
      date: price.date,
      macd: macdLine[i],
      signal: signalLine[i],
      histogram: macdLine[i] - signalLine[i]
    }));
  }

  calculateEMA(values, period) {
    const k = 2 / (period + 1);
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(values[i] * k + ema[i-1] * (1 - k));
    }
    return ema;
  }

  groupPatentsByType(patents) {
    return patents.reduce((acc, patent) => {
      acc[patent.patent_type] = (acc[patent.patent_type] || 0) + 1;
      return acc;
    }, {});
  }

  groupFDAFilingsByStatus(filings) {
    return filings.reduce((acc, filing) => {
      acc[filing.status] = (acc[filing.status] || 0) + 1;
      return acc;
    }, {});
  }

  analyzeSentiment(text) {
    const positiveWords = new Set(['up', 'gain', 'growth', 'positive', 'profit', 'success', 'launch', 'innovation']);
    const negativeWords = new Set(['down', 'loss', 'decline', 'negative', 'risk', 'fail', 'delay', 'concern']);
    
    const words = text.toLowerCase().split(/\W+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.has(word)) score++;
      if (negativeWords.has(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  calculateNewsSentiment(newsData) {
    const sentiments = newsData.map(article => this.analyzeSentiment(article.title));
    const counts = sentiments.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});
    
    return {
      overall: sentiments.filter(s => s === 'positive').length > sentiments.length / 2 ? 'positive' : 'negative',
      distribution: counts
    };
  }

  async calculateFinancialMetrics(data) {
    const metrics = this.extractDetailedMetrics(data);
    return {
      profitability: {
        grossMargin: this.calculateGrossMargin(metrics),
        operatingMargin: this.calculateOperatingMargin(metrics),
        netMargin: this.calculateNetMargin(metrics),
        roa: this.calculateROA(metrics),
        roe: this.calculateROE(metrics)
      },
      liquidity: {
        currentRatio: this.calculateCurrentRatio(metrics),
        quickRatio: this.calculateQuickRatio(metrics),
        cashRatio: this.calculateCashRatio(metrics)
      },
      efficiency: {
        assetTurnover: this.calculateAssetTurnover(metrics),
        inventoryTurnover: this.calculateInventoryTurnover(metrics),
        receivablesTurnover: this.calculateReceivablesTurnover(metrics)
      },
      leverage: {
        debtToEquity: this.calculateDebtToEquity(metrics),
        interestCoverage: this.calculateInterestCoverage(metrics),
        fixedChargeCoverage: this.calculateFixedChargeCoverage(metrics)
      },
      growth: {
        revenueGrowth: metrics.revenue?.growth,
        netIncomeGrowth: metrics.netIncome?.growth,
        assetGrowth: this.calculateAssetGrowth(metrics)
      }
    };
  }

  calculateGrossMargin(metrics) {
    const grossProfit = metrics.revenue?.current - (metrics.costOfRevenue?.current || 0);
    return grossProfit / metrics.revenue?.current * 100;
  }

  calculateOperatingMargin(metrics) {
    return (metrics.operatingIncome?.current / metrics.revenue?.current) * 100;
  }

  calculateNetMargin(metrics) {
    return (metrics.netIncome?.current / metrics.revenue?.current) * 100;
  }

  calculateROA(metrics) {
    return (metrics.netIncome?.current / metrics.totalAssets?.current) * 100;
  }

  calculateROE(metrics) {
    const equity = metrics.totalAssets?.current - metrics.totalLiabilities?.current;
    return (metrics.netIncome?.current / equity) * 100;
  }

  calculateCurrentRatio(metrics) {
    return metrics.currentAssets?.current / metrics.currentLiabilities?.current;
  }

  calculateQuickRatio(metrics) {
    const quickAssets = metrics.currentAssets?.current - (metrics.inventory?.current || 0);
    return quickAssets / metrics.currentLiabilities?.current;
  }

  calculateCashRatio(metrics) {
    return metrics.cashAndEquivalents?.current / metrics.currentLiabilities?.current;
  }

  calculateAssetTurnover(metrics) {
    return metrics.revenue?.current / metrics.totalAssets?.current;
  }

  calculateInventoryTurnover(metrics) {
    return metrics.costOfRevenue?.current / (metrics.inventory?.current || 1);
  }

  calculateReceivablesTurnover(metrics) {
    return metrics.revenue?.current / (metrics.accountsReceivable?.current || 1);
  }

  calculateInterestCoverage(metrics) {
    return metrics.operatingIncome?.current / (metrics.interestExpense?.current || 1);
  }

  calculateFixedChargeCoverage(metrics) {
    const fixedCharges = (metrics.interestExpense?.current || 0) + (metrics.leasePayments?.current || 0);
    return metrics.operatingIncome?.current / (fixedCharges || 1);
  }

  calculateAssetGrowth(metrics) {
    if (!metrics.totalAssets?.current || !metrics.totalAssets?.previous) return null;
    return ((metrics.totalAssets.current - metrics.totalAssets.previous) / metrics.totalAssets.previous) * 100;
  }
}

// export default EnhancedMarketReport;



// const besasdarertoken=`AAAAAAAAAAAAAAAAAAAAANkstgEAAAAAU6TVbVxmf7riF%2BdmgGjHGnIhwIQ%3D6DIC0mE2nO3VLdPTEC2CeiL1Rc86tRtHitn1pEJ7vjyHFtnCiQ`
// const key = tOYGdLGrrBQhMdJ2Zy1iqkexS
// const secret = PPjOpxQkZVXVXDdfoitaYTadFx2MzjPUzekuskrFYA36JC28x1
// Start server

// Function to get total traffic
async function getWebsiteTraffic(domain, apiKey) {
  const url = `https://api.similarweb.com/v1/website/${domain}/traffic-sources?api_key=${apiKey}`;
  try {
      const response = await fetch(url);
      // const data = await response.json();
      console.log(`Traffic sources for ${domain}:`, response);
      return data;
  } catch (error) {
      console.error('Error fetching traffic sources:', error);
  }
}

// Example usage


const { runCompetitiveAnalysis } = require('./competitive-analyzer');


const PORT = process.env.PORT || 5500;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

//   domain = "similarweb.com"
//   const response = await fetch(`https://api.similarweb.com/v1/similar-rank/${domain}/rank?api_key=${process.env.SIMILARWEB_API_KEY}`, {
//     headers: { 'api-key': process.env.SIMILARWEB_API_KEY }
// });

// console.log(response)

// runCompetitiveAnalysis()
//   .then(report => console.log('Analysis complete'))
//   .catch(error => console.error('Error:', error));
  

  // // getCompanyTweets();
  // (async () => {
  //   // const secApiKey = 'YOUR_SEC_API_KEY';
    const usptoApiKey = 'sQ4l3fCxqzkaf0hP5YKpBxDDixBNy1RD';
    const secApiKey = process.env.SEC_USER_AGENT // Replace with your actual API key
  //   const cik = '0000066740'; // Replace with the CIK of the company
  //   const ticker = 'MMM'; // Example Ticker
  //   const companyName = '3M Co';
  
  //   const reportGenerator = new ComprehensiveReport(secApiKey, usptoApiKey);
  //   const report = await reportGenerator.generateReport(cik, ticker, companyName);
  //   console.log('Generated Report:', report);
  // })();

  // (async () => {
  //   const companyName = 'Pfizer';
  //   const report = await generateReport(companyName);
  //   console.log(report);
  // })();


  // Initialize the report generator
// const reporter = new EnhancedMarketReport(secApiKey, usptoApiKey);

// // Define company and competitors
// const mainCompany = {
//   name: "3M Co.",
//   cik: "0000066740",
//   ticker: "MMM"
// };

// const competitors = [
//   { name: "Microsoft", cik: "0000789019", ticker: "MSFT" },
//   { name: "Google", cik: "0001652044", ticker: "GOOGL" }
// ];

// // Generate report
// const report = await reporter.generateEnhancedReport(mainCompany, competitors);


  // getRecentTrademarks()
  // .then(data => {
  //   console.log(data);
  // })
  // .catch(error => {
  //   console.error(error);
  // });
  

        // console.log('\nTesting Trademarks...');
        // const trademarkData = await testTrademarks('Apple');
        // console.log(JSON.stringify(trademarkData, null, 2));

// id = await TwitterUserID()
// (async () => {
//   const apiKey = process.env.SEC_USER_AGENT // Replace with your actual API key
//   const cik = '0000066740'; // Replace with the CIK of the company
//   const ticker = 'MMM'; // Example Ticker

//   const reportGenerator = new EdgarYahooReport(apiKey);
//   const report = await reportGenerator.generateReport(cik, ticker);
//   console.log('Generated Report:', report);
// })();



// Define the API endpoint and parameters
// const userId = "1628019983635603457"; // Replace with the actual user ID
// const token = "AAAAAAAAAAAAAAAAAAAAANkstgEAAAAAU6TVbVxmf7riF%2BdmgGjHGnIhwIQ%3D6DIC0mE2nO3VLdPTEC2CeiL1Rc86tRtHitn1pEJ7vjyHFtnCiQ";      // Replace with your Bearer token

// const url = `https://api.x.com/2/users/${userId}/tweets`;

// // Make the GET request
// axios
//   .get(url, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   })
//   .then((response) => {
//     console.log("Response Data:", response.data);
//   })
//   .catch((error) => {
//     console.error("Error:", error.response ? error.response.data : error.message);
//   });

//   runTests()
//   // Usage example:




// const analyzer = new SECAnalyzer(process.env.SEC_USER_AGENT);
// console.log('Starting SEC analysis...');

// analyzer.analyze()
//     .then(() => console.log('Analysis complete'))
//     .catch(console.error);



  // fetchFCCFeed()
//   axios.post(
//     'https://api.crunchbase.com/api/v4/searches/organizations',
//     {
//       field_ids: ["name", "identifier"],
//       query: [],
//       limit: 10
//     },
//     {
//       headers: { 'X-cb-user-key': process.env.CRUNCHBASE_API_KEY }
//     }
//   )
//     .then(response => console.log(response.data))
//     .catch(error => console.error(error.response?.data));
  
  
});