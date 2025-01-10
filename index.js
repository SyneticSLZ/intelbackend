// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const querystring = require('querystring');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


//INDIVIDUAL ENDPOINTS
// Enhanced Patents API endpoint
// Helper function to generate company name variations
function getCompanyNameVariations(companyName) {
    if (!companyName || typeof companyName !== 'string') {
      throw new Error('Invalid company name provided');
    }
  
    const name = companyName.toLowerCase().trim();
    const variations = new Set([name]);
    
    // Remove common suffixes
    const suffixes = [
      'corporation', 'corp', 'incorporated', 'inc', 'company', 'co', 
      'limited', 'ltd', 'llc', 'plc', 'holdings', 'group', 'technologies'
    ];
    
    let cleanName = name;
    suffixes.forEach(suffix => {
      cleanName = cleanName.replace(new RegExp(`\\s+${suffix}\\.?\\s*$`, 'i'), '');
    });
    variations.add(cleanName);
  
    // Common abbreviations
    const abbreviations = {
      'international business machines': 'ibm',
      'international': 'intl',
      'technology': 'tech',
      'corporation': 'corp',
      'incorporated': 'inc',
      'limited': 'ltd'
    };
  
    Object.entries(abbreviations).forEach(([full, abbrev]) => {
      if (name.includes(full)) {
        variations.add(name.replace(full, abbrev));
      }
    });
  
    return Array.from(variations);
  }


  async function fetchPatentsForDate(startDate, companyName) {
    const url = 'https://api.patentsview.org/patents/query';
    let per_page = 1000
    
    const requestBody = {
      q: {
        "_and": [
          {
            "_contains": {
              "assignee_organization": companyName
            }
          },
          {
            "_gte": { "patent_date": startDate }
          },
          {
            "_lte": { "patent_date": "2025-10-28" }
          }
        ]
      },
      f: [
        "patent_number",
        "patent_title",
        "patent_date",
        "patent_type",
        "patent_kind",
        "assignee_organization",
        "patent_processing_time",
        "assignee_sequence",
        "uspc_sequence",
        "cited_patent_number",
        "citedby_patent_number",
        "assignee_country",
        "inventor_country",
        "cpc_group_id",
        "govint_org_name"
      ],
      o: {
        "patent_date": "desc"
      },
      per_page
    };

    try {

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.patents) {
        throw new Error('Invalid response format from PatentsView API');
      }

      return response.data.patents;
    } catch (error) {
      console.error(`Error fetching patents for date ${startDate}:`, error);
      return [];
    }
  }

  app.post('/api/company-patents', async (req, res) => {
    const { companyName, per_page = 100 } = req.body;
    allPatents = []
    const dates = ['2024-07-09', '2024-08-13', '2024-08-27', '2024-09-17'];
    try {


    //   const url = 'https://api.patentsview.org/patents/query';
      
    //   const requestBody = {
    //     // q: {
    //     //   "_contains": {
    //     //     "assignee_organization": companyName
    //     //   }
    //     // },

    //     q:{"_and":[
    //         {"_contains": {
    //         "assignee_organization": companyName
    //       }},
    //         {"_gte":{"patent_date":"2024-07-09"}},
    //         {"_lte":{"patent_date":"2025-10-28"}}
    //     ]},

    //     // q:{"patent_id":"12187932"},

    //     f: [
    //       "patent_number",
    //       "patent_title",
    //       "patent_date",
    //       "patent_type",
    //       "patent_kind",
    //       "assignee_organization",
    //       "patent_processing_time",
    //       "assignee_sequence",
    //       "uspc_sequence",
    //       "cited_patent_number",
    //       "citedby_patent_number",
    //       "assignee_country",
    //       "inventor_country",
    //       "cpc_group_id",
    //       "govint_org_name"
    //     ],
    //     o: {
    //       "patent_date": "desc"
    //     },
    //     // o:{"size":1,"sort":[{"patent_date":"asc"}]},
    //     // s: [{"patent_date": "desc"}],
    //     per_page
    //   };
      
    // //   console.log('Sending request to PatentsView API:', JSON.stringify(requestBody, null, 2));
      
    //   const response = await axios.post(url, requestBody, {
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     timeout: 30000
    //   });
  
    //   if (!response.data || !response.data.patents) {
    //     throw new Error('Invalid response format from PatentsView API');
    //   }
// Fetch patents for all dates
for (const date of dates) {
    const patents = await fetchPatentsForDate(date, companyName);
    allPatents.push(...patents);
  }

  // Remove duplicates based on patent number
  const uniquePatents = Array.from(new Map(
    allPatents.map(patent => [patent.patent_number, patent])
  ).values());

  // Transform the data
  const patents = uniquePatents.map(patent => {
    console.log(patent.patent_date);
    
    const status = determinePatentStatus(patent.patent_kind, patent.patent_type);
    
    return {
      title: patent.patent_title,
      issueDate: patent.patent_date,
      id: patent.patent_number,
      status: status,
      type: patent.patent_type || 'Unknown Type',
      assignee: patent.assignees?.[0]?.assignee_organization || 'Unknown',
      country: patent.assignees?.[0]?.assignee_country,
      citations: {
        cited: patent.cited_patents?.length || 0,
        citedBy: patent.citedby_patents?.length || 0
      }
    };
  });
      

    //   const patents = response.data.patents.map(patent => {
    //     console.log(patent.patent_date)

    //     const status = determinePatentStatus(patent.patent_kind, patent.patent_type);
        
    //     return {
    //       title: patent.patent_title,
    //       issueDate: patent.patent_date,
    //       id: patent.patent_number,
    //       status: status,
    //       type: patent.patent_type || 'Unknown Type',
    //       assignee: patent.assignees[0].assignee_organization || 'Unknown',
    //       country: patent.assignees[0].assignee_country,
    //       citations: {
    //         cited: patent.cited_patents?.length || 0,
    //         citedBy: patent.citedby_patents?.length || 0
    //       }
    //     }
    //     ;
    //   });
  
      // Calculate total patent count and current year patents
      const currentYear = new Date().getFullYear();
      const currentYearPatents = patents.filter(patent => new Date(patent.issueDate).getFullYear() === currentYear);
  
      res.json({
        patents,
        metadata: {
          total: patents.length,
          currentYearCount: currentYearPatents.length,
          query_date: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('PatentsView API Error:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Error fetching patent data',
        details: error.response?.data || error.message
      });
    }
  });
  
  // Helper function to determine patent status
  function determinePatentStatus(kind, type) {
    if (!kind) return 'Unknown';
    
    // Common USPTO kind codes
    switch(kind) {
      case 'B1': case 'B2':
        return 'Granted';
      case 'A1': case 'A2':
        return 'Application';
      case 'S1':
        return 'Design Patent';
      case 'E1':
        return 'Reissue';
      case 'H1':
        return 'Statutory Invention Registration';
      default:
        return type || 'Unknown';
    }
  }



// FDA API Utility Functions
async function callFDAAPI(endpoint, params, retries = 3) {
    try {
        // Log the full request details
        const url = `https://api.fda.gov/${endpoint}`;
        const fullParams = {
            api_key: process.env.FDA_API_KEY,
            ...params
        };
        
        // console.log('\nMaking FDA API request:', {
        //     url,
        //     params: fullParams,
        //     attempt: 4 - retries
        // });

        const response = await axios.get(url, {
            params: fullParams,
            timeout: 10000
        });

        // Log successful response details
        // console.log('API Response:', {
        //     status: response.status,
        //     totalResults: response.data?.meta?.results?.total || 0,
        //     resultsReturned: response.data?.results?.length || 0
        // });

        return response.data;
    } catch (error) {
        // Enhanced error logging
        // console.error('FDA API Error Details:', {
        //     endpoint,
        //     params,
        //     status: error.response?.status,
        //     statusText: error.response?.statusText,
        //     data: error.response?.data,
        //     message: error.message,
        //     attempt: 4 - retries
        // });

        // Handle rate limiting
        if (retries > 0 && error.response?.status === 429) {
            console.log('Rate limited, retrying after 1 second...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return callFDAAPI(endpoint, params, retries - 1);
        }

        // Handle 404 (No results found)
        if (error.response?.status === 404) {
            console.log('No results found (404 response)');
            return { results: [], meta: { results: { total: 0 } } };
        }

        throw error;
    }
}

// Helper function to use the variations in a search
async function searchWithVariations(companyName) {
    try {
        console.log(`Finding variations for: ${companyName}`);
        
        const { variations, products, relatedNames } = await findCompanyVariations(companyName);
        
        console.log('\nFound variations:', variations);
        console.log('\nRelated product names:', products);
        console.log('\nPotential related names:', relatedNames);

        // Build a combined search query
        const searchQuery = variations
            .map(name => `name:"${name}"`)
            .join(' OR ');

        console.log('\nSearching with combined query...');
        
        const results = await callFDAAPI('device/registrationlisting/registration.json', {
            search: searchQuery,
            limit: 100
        });

        return {
            query: searchQuery,
            variations,
            products,
            relatedNames,
            results: results.results || [],
            total: results.meta?.results?.total || 0
        };
    } catch (error) {
        console.error('Error in variation search:', error);
        throw error;
    }
}


async function findCompanyVariations(baseCompanyName) {
    try {
        // Clean the base name
        const cleanName = baseCompanyName.trim().toUpperCase();
        const variations = new Set([cleanName]);
        const products = new Set();
        const relatedNames = new Set();

        // Common company suffixes to try
        const suffixes = ['CO', 'COMPANY', 'CORP', 'CORPORATION', 'INC', 'LLC', 'LTD'];
        // Common prefixes/joining words to remove
        const removables = ['THE', 'AND', '&'];

        // Add basic variations
        suffixes.forEach(suffix => {
            variations.add(`${cleanName} ${suffix}`);
        });

        // Try searching without common prefixes
        const words = cleanName.split(' ');
        if (removables.includes(words[0])) {
            variations.add(words.slice(1).join(' '));
        }

        // Search the registration endpoint
        const registrationResponse = await callFDAAPI('device/registrationlisting/registration.json', {
            search: `name:(${cleanName})`,
            limit: 100
        });

        // Process registration results
        if (registrationResponse?.results) {
            registrationResponse.results.forEach(result => {
                if (result.name) variations.add(result.name.toUpperCase());
                
                // Check company details for additional names
                if (result.business_name) variations.add(result.business_name.toUpperCase());
                if (result.trade_name) variations.add(result.trade_name.toUpperCase());
            });
        }

        // Search listings endpoint for product names and related companies
        const listingResponse = await callFDAAPI('device/registrationlisting/listing.json', {
            search: `company_name:(${cleanName})`,
            limit: 100
        });

        // Process listing results
        if (listingResponse?.results) {
            listingResponse.results.forEach(result => {
                // Collect product names
                if (result.product_codes) {
                    result.product_codes.forEach(product => {
                        if (product.product_name) {
                            products.add(product.product_name.toUpperCase());
                            
                            // Extract potential company names from product names
                            const productWords = product.product_name.split(/[;,-]/);
                            productWords.forEach(phrase => {
                                if (phrase.includes(cleanName)) {
                                    relatedNames.add(phrase.trim().toUpperCase());
                                }
                            });
                        }
                    });
                }
            });
        }

        // Remove duplicates and obviously wrong matches
        const filteredVariations = Array.from(variations).filter(name => {
            // Remove very long strings
            if (name.length > 100) return false;
            // Remove strings with unusual characters
            if (/[^A-Z0-9\s&.,()-]/.test(name)) return false;
            // Remove if doesn't contain any part of original name
            const nameParts = cleanName.split(' ');
            return nameParts.some(part => name.includes(part));
        });

        return {
            variations: filteredVariations,
            products: Array.from(products),
            relatedNames: Array.from(relatedNames)
        };
    } catch (error) {
        console.error('Error finding company variations:', error);
        throw error;
    }
}

// Main intelligence endpoint
app.post('/api/company-intelligence', async (req, res) => {
    const { companyName } = req.body;
    
    if (!companyName) {
        return res.status(400).json({ 
            error: 'Company name is required',
            status: 'error'
        });
    }
    
    try {
//         // For a single company search
const results = await searchWithVariations('3M');

// The results will include:
console.log('Found variations:', results.variations);
console.log('Total matches:', results.total);
console.log('Related products:', results.products);
console.log('Related names:', results.relatedNames);

// If you want to use just the name finder
// const variations = await findCompanyVariations('3M');
// console.log('Possible company names:', variations.variations);


        // Get all possible company names (including subsidiaries and variants)
        const companyVariants = await getCompanyVariants("pfizer");
        
        // Parallel requests for all data sources with error handling
        const [
            drugData,
            clinicalTrials,
            recalls,
            facilities,
            adverseEvents,
            labels
        ] = await Promise.allSettled([

            fetchDrugApplications(companyVariants),
            fetchClinicalTrials(companyVariants),
            fetchRecalls(companyVariants),


            fetchFacilities(companyVariants),
            fetchAdverseEvents(companyVariants),
            fetchDrugLabels(companyVariants)
            
        ]);

        console.log(
            // drugData.value[0]
            clinicalTrials,
        //  recalls
        //   'facil',  facilities,
        //   'adverse',  adverseEvents,
        //    'labels' ,labels
        )

        // Process successful results and handle failures
        // const intelligence = {
        //     metadata: {
        //         queriedCompany: companyName,
        //         variants: companyVariants,
        //         timestamp: new Date().toISOString(),
        //         dataFreshness: {
        //             drug: drugData.status === 'fulfilled' ? 'current' : 'error',
        //             clinical: clinicalTrials.status === 'fulfilled' ? 'current' : 'error',
        //             safety: recalls.status === 'fulfilled' ? 'current' : 'error',
        //             facilities: facilities.status === 'fulfilled' ? 'current' : 'error'
        //         }
        //     },
        //     companyProfile: {
        //         name: companyName,
        //         variants: companyVariants,
        //         facilities: processFacilitiesData(getFulfilledValue(facilities))
        //     },
        //     drugDevelopment: {
        //         applications: processDrugData(getFulfilledValue(drugData)),
        //         clinicalTrials: analyzeClinicalTrials(getFulfilledValue(clinicalTrials)),
        //         labels: analyzeProductDiversity(getFulfilledValue(labels))
        //     },
        //     // manufacturing: {
        //     //     facilities: getFulfilledValue(facilities).length,
        //     //     locations: getManufacturingLocations(getFulfilledValue(facilities)),
        //     //     metrics: analyzeManufacturing(
        //     //         getFulfilledValue(facilities),
        //     //         [] // Inspections data if available
        //     //     )
        //     // },
        //     // safety: {
        //     //     recalls: processSafetyData(getFulfilledValue(recalls)),
        //     //     adverseEvents: analyzeSafetyProfile(
        //     //         getFulfilledValue(recalls),
        //     //         getFulfilledValue(adverseEvents)
        //     //     )
        //     // },
        //     // market: await buildMarketIntelligence(
        //     //     getFulfilledValue(drugData),
        //     //     getFulfilledValue(labels)
        //     // ),
        //     // riskAnalysis: {
        //     //     overall: calculateRiskScore(
        //     //         getFulfilledValue(recalls),
        //     //         getFulfilledValue(adverseEvents)
        //     //     ),
        //     //     categories: {
        //     //         safety: calculateSafetyRisk(getFulfilledValue(recalls), getFulfilledValue(adverseEvents)),
        //     //         manufacturing: calculateManufacturingRisk(getFulfilledValue(facilities)),
        //     //         compliance: calculateComplianceRisk(getFulfilledValue(facilities))
        //     //     }
        //     // },
        //     timeline: generateCompanyTimeline({
        //         applications: getFulfilledValue(drugData),
        //         trials: getFulfilledValue(clinicalTrials),
        //         recalls: getFulfilledValue(recalls)
        //     }),
        //     errors: getFailedRequests([
        //         { name: 'drugData', result: drugData },
        //         { name: 'clinicalTrials', result: clinicalTrials },
        //         { name: 'recalls', result: recalls },
        //         { name: 'facilities', result: facilities },
        //         { name: 'adverseEvents', result: adverseEvents },
        //         { name: 'labels', result: labels }
        //     ])
        // };

        // Cache the results if caching is enabled
        if (process.env.ENABLE_CACHE === 'true') {
            await cacheIntelligenceData(companyName, intelligence);
        }

        // Add rate limit information to response headers
        if (drugData.status === 'fulfilled' && drugData.value.meta?.rateLimit) {
            res.set({
                'X-RateLimit-Limit': drugData.value.meta.rateLimit.limit,
                'X-RateLimit-Remaining': drugData.value.meta.rateLimit.remaining,
                'X-RateLimit-Reset': drugData.value.meta.rateLimit.reset
            });
        }

        res.json({
            status: 'success',
            // data: intelligence,
            meta: {
                requestId: req.id,
                processingTime: process.hrtime(req.startTime),
                // dataSourcesAvailable: calculateDataSourceAvailability([
                //     drugData, clinicalTrials, recalls, facilities, adverseEvents, labels
                // ])
            }
        });
        
    } catch (error) {
        console.error('FDA Intelligence Error:', {
            company: companyName,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({ 
            status: 'error',
            error: 'Error fetching FDA intelligence',
            details: error.message,
            requestId: req.id,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Company profile and structure
async function getCompanyVariants(companyName) {
    try {
        // Query both drug and device databases for all possible company names
        const [drugSponsors, deviceManufacturers] = await Promise.allSettled([
            // Drug applications database
            callFDAAPI('drug/drugsfda.json', {
                search: `sponsor_name:"${companyName}"`,
                limit: 1000,
                count: 'sponsor_name.exact'
            }),
            
            // Device registrations
            callFDAAPI('device/registrationlisting/registration.json', {
                search: `name:"${companyName}"`,
                limit: 1000,
                count: 'name.exact'
            })
        ]);

        const variants = new Set([companyName]);

        // Add drug sponsor names if available
        if (drugSponsors.status === 'fulfilled' && drugSponsors.value.results) {
            drugSponsors.value.results.forEach(r => variants.add(r.term));
        }

        // Add device manufacturer names if available
        if (deviceManufacturers.status === 'fulfilled' && deviceManufacturers.value.results) {
            deviceManufacturers.value.results.forEach(r => variants.add(r.term));
        }

        return Array.from(variants);
    } catch (error) {
        console.warn('Error fetching company variants:', error.message);
        return [companyName];
    }
}

// Drug applications data
// Drug applications data
async function fetchDrugApplications(companyVariants) {
    try {
        const searchQuery = companyVariants
            .map(name => `sponsor_name:"${name}"`)
            .join(' OR ');

        const response = await callFDAAPI('drug/drugsfda.json', {
            search: searchQuery,
            limit: 1000
        });

        return response.results || [];
    } catch (error) {
        console.warn('Drug application data unavailable:', error.message);
        return [];
    }
}

// Clinical trials data
async function fetchClinicalTrials(companyVariants) {
    try {
        const searchQuery = companyVariants
            .map(name => `sponsor.name:"${name}"`)
            .join(' OR ');

        const response = await callFDAAPI('drug/ndc.json', {
            search: searchQuery,
            limit: 1000
        });

        return response.results || [];
    } catch (error) {
        console.warn('Clinical trials data unavailable:', error.message);
        return [];
    }
}
// Facilities and manufacturing data
/**
 * Fetches facility registration data from the FDA API for given company name variants
 * @param {string[]} companyVariants - Array of company name variations to search for
 * @returns {Promise<{results: Array, status: string, message: string}>} Object containing results and status information
 */
async function fetchFacilities(companyVariants) {
    if (!Array.isArray(companyVariants) || companyVariants.length === 0) {
        throw new Error('Company variants must be a non-empty array');
    }

    try {
        // Sanitize company names and build search query
        const searchQuery = companyVariants
            .map(name => {
                const sanitizedName = name
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/"/g, '\\"');
                
                return sanitizedName ? `name:"${sanitizedName}"` : null;
            })
            .filter(Boolean)
            .join(' OR ');

        if (!searchQuery) {
            return {
                results: [],
                status: 'INVALID_INPUT',
                message: 'No valid company names provided for search'
            };
        }

        // Make initial API request to check response structure
        const response = await callFDAAPI('device/registrationlisting/registration.json', {
            search: searchQuery,
            limit: 1
        });

        // Validate response structure
        if (!response || typeof response !== 'object') {
            return {
                results: [],
                status: 'API_ERROR',
                message: 'Invalid API response format'
            };
        }

        // Check if response has expected properties
        if (!('meta' in response) || !('results' in response)) {
            return {
                results: [],
                status: 'API_ERROR',
                message: 'Unexpected API response structure'
            };
        }

        // Valid empty response case
        if (response.meta?.results?.total === 0) {
            return {
                results: [],
                status: 'NO_RESULTS',
                message: `No facilities found for the provided company names: ${companyVariants.join(', ')}`
            };
        }

        // If we get here, the API is working and has results, so fetch all of them
        const results = [];
        let skip = 0;
        const LIMIT = 100;

        while (true) {
            const fullResponse = await callFDAAPI('device/registrationlisting/registration.json', {
                search: searchQuery,
                limit: LIMIT,
                skip: skip
            });

            if (!fullResponse?.results || !Array.isArray(fullResponse.results)) {
                break;
            }

            results.push(...fullResponse.results);

            if (fullResponse.results.length < LIMIT) {
                break;
            }

            skip += LIMIT;

            if (results.length >= 1000) {
                console.warn('Maximum result limit reached');
                break;
            }
        }

        return {
            results,
            status: 'SUCCESS',
            message: `Found ${results.length} facilities`
        };

    } catch (error) {
        console.error('Error fetching facility data:', {
            message: error.message,
            companyVariants,
            stack: error.stack
        });

        return {
            results: [],
            status: 'ERROR',
            message: `API request failed: ${error.message}`
        };
    }
}


// Inspections data
async function fetchInspections(companyVariants) {
    try {
        const searchQuery = companyVariants
            .map(name => `company_name:"${name}"`)
            .join(' OR ');

        const response = await callFDAAPI('device/inspections.json', {
            search: searchQuery,
            limit: 1000
        });

        return response.results || [];
    } catch (error) {
        console.warn('Inspection data unavailable:', error.message);
        return [];
    }
}
// Recalls and enforcement data
async function fetchRecalls(companyVariants) {
    try {
        const searchQuery = companyVariants
            .map(name => `recalling_firm:"${name}"`)
            .join(' OR ');

        const response = await callFDAAPI('drug/enforcement.json', {
            search: searchQuery,
            limit: 1000
        });

        return response.results || [];
    } catch (error) {
        console.warn('Recall data unavailable:', error.message);
        return [];
    }
}

// Adverse events data
async function fetchAdverseEvents(companyVariants) {
    const searchQuery = companyVariants
        .map(name => `manufacturer_name:"${name}"`)
        .join(' OR ');

    const response = await callFDAAPI('drug/event.json', {
        search: searchQuery,
        limit: 1000
    });

    return response.results || [];
}

// Drug labels data
async function fetchDrugLabels(companyVariants) {
    const searchQuery = companyVariants
        .map(name => `openfda.manufacturer_name:"${name}"`)
        .join(' OR ');

    const response = await callFDAAPI('drug/label.json', {
        search: searchQuery,
        limit: 1000
    });

    return response.results || [];
}

// Analysis Functions
function analyzeDrugApplications(applications) {
    return {
        total: applications.length,
        activeApplications: applications.filter(app => 
            app.submissions?.[0]?.submission_status?.toLowerCase().includes('pending')
        ).length,
        approvedProducts: applications.filter(app =>
            app.submissions?.some(sub => 
                sub.submission_status?.toLowerCase().includes('approve')
            )
        ).length,
        byType: groupApplicationsByType(applications),
        successRate: calculateSuccessRate(applications),
        reviewTimes: calculateReviewTimes(applications),
        therapeuticAreas: analyzeTherapeuticAreas(applications)
    };
}

function analyzeClinicalTrials(trials) {
    return {
        total: trials.length,
        activeTrials: trials.filter(trial => 
            trial.overall_status === 'Recruiting' || 
            trial.overall_status === 'Active, not recruiting'
        ).length,
        byPhase: groupTrialsByPhase(trials),
        completionRate: calculateTrialCompletionRate(trials),
        developmentSpeed: calculateDevelopmentSpeed(trials),
        enrollmentMetrics: calculateEnrollmentMetrics(trials)
    };
}

// Manufacturing Analysis Functions
function analyzeManufacturing(facilities, inspections) {
    return {
        totalFacilities: facilities.length,
        geographicDistribution: calculateGeographicDistribution(facilities),
        facilityTypes: calculateFacilityTypes(facilities),
        inspectionHistory: analyzeInspectionHistory(inspections),
        qualityMetrics: calculateQualityMetrics(facilities, inspections),
        complianceRate: calculateComplianceRate(inspections),
        riskAssessment: assessManufacturingRisk(facilities, inspections)
    };
}

function calculateGeographicDistribution(facilities) {
    // Group facilities by country and region
    const distribution = {
        byCountry: {},
        byRegion: {},
        primaryLocations: []
    };

    facilities.forEach(facility => {
        // Handle country distribution
        const country = facility.country || 'Unknown';
        distribution.byCountry[country] = (distribution.byCountry[country] || 0) + 1;

        // Handle region distribution
        const region = getRegion(facility.country);
        distribution.byRegion[region] = (distribution.byRegion[region] || 0) + 1;
    });

    // Identify primary manufacturing locations (top 3 countries)
    distribution.primaryLocations = Object.entries(distribution.byCountry)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([country, count]) => ({
            country,
            count,
            percentage: ((count / facilities.length) * 100).toFixed(1)
        }));

    return distribution;
}

function calculateFacilityTypes(facilities) {
    return facilities.reduce((acc, facility) => {
        const type = facility.facility_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
}

function analyzeInspectionHistory(inspections = []) {
    const history = {
        total: inspections.length,
        byYear: {},
        byOutcome: {},
        recentFindings: []
    };

    inspections.forEach(inspection => {
        // Group by year
        const year = new Date(inspection.inspection_date).getFullYear();
        if (!isNaN(year)) {
            history.byYear[year] = (history.byYear[year] || 0) + 1;
        }

        // Group by outcome
        const outcome = inspection.inspection_outcome || 'Unknown';
        history.byOutcome[outcome] = (history.byOutcome[outcome] || 0) + 1;

        // Track recent findings
        if (inspection.findings) {
            history.recentFindings.push({
                date: inspection.inspection_date,
                outcome: outcome,
                findings: inspection.findings
            });
        }
    });

    // Sort and limit recent findings
    history.recentFindings.sort((a, b) => new Date(b.date) - new Date(a.date));
    history.recentFindings = history.recentFindings.slice(0, 5);

    return history;
}

function calculateQualityMetrics(facilities, inspections = []) {
    return {
        inspectionRate: calculateInspectionRate(facilities, inspections),
        complianceScore: calculateComplianceScore(inspections),
        qualityTrends: analyzeQualityTrends(inspections),
        riskFactors: identifyRiskFactors(facilities, inspections)
    };
}

function calculateComplianceRate(inspections = []) {
    if (!inspections.length) return 100;

    const compliantInspections = inspections.filter(inspection => 
        inspection.inspection_outcome?.toLowerCase().includes('no action') ||
        inspection.inspection_outcome?.toLowerCase().includes('compliant')
    ).length;

    return ((compliantInspections / inspections.length) * 100).toFixed(1);
}

function assessManufacturingRisk(facilities, inspections = []) {
    const risks = {
        geographic: assessGeographicRisk(facilities),
        operational: assessOperationalRisk(facilities),
        compliance: assessComplianceRisk(inspections),
        capacity: assessCapacityRisk(facilities)
    };

    // Calculate overall risk score (weighted average)
    const weights = {
        geographic: 0.25,
        operational: 0.25,
        compliance: 0.3,
        capacity: 0.2
    };

    const overallScore = Object.entries(risks).reduce((score, [key, value]) => {
        return score + (value.score * weights[key]);
    }, 0);

    return {
        overall: Math.round(overallScore),
        categories: risks
    };
}

// Helper Functions
function getRegion(country) {
    const regionMap = {
        'US': 'North America',
        'CA': 'North America',
        'MX': 'North America',
        'GB': 'Europe',
        'DE': 'Europe',
        'FR': 'Europe',
        'IT': 'Europe',
        'ES': 'Europe',
        'CN': 'Asia',
        'JP': 'Asia',
        'KR': 'Asia',
        'IN': 'Asia'
        // Add more country-to-region mappings as needed
    };

    return regionMap[country] || 'Other';
}

function calculateInspectionRate(facilities, inspections) {
    const timeframe = 365 * 2; // 2 years in days
    const now = new Date();
    const recentInspections = inspections.filter(inspection => {
        const inspectionDate = new Date(inspection.inspection_date);
        const daysDiff = (now - inspectionDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= timeframe;
    }).length;

    return {
        annualRate: ((recentInspections / facilities.length) * (365 / timeframe)).toFixed(2),
        coverage: ((recentInspections / facilities.length) * 100).toFixed(1)
    };
}

function calculateComplianceScore(inspections) {
    if (!inspections.length) return 100;

    const weights = {
        'Official Action Indicated': 0,
        'Voluntary Action Indicated': 50,
        'No Action Indicated': 100,
        'Unknown': 50
    };

    const scores = inspections.map(inspection => 
        weights[inspection.inspection_outcome] || weights['Unknown']
    );

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function analyzeQualityTrends(inspections) {
    const trends = {
        byYear: {},
        improvement: false,
        significantFindings: []
    };

    // Group inspections by year
    inspections.forEach(inspection => {
        const year = new Date(inspection.inspection_date).getFullYear();
        if (!isNaN(year)) {
            if (!trends.byYear[year]) {
                trends.byYear[year] = {
                    total: 0,
                    compliant: 0
                };
            }
            trends.byYear[year].total++;
            if (inspection.inspection_outcome?.toLowerCase().includes('no action')) {
                trends.byYear[year].compliant++;
            }
        }
    });

    // Calculate year-over-year improvement
    const years = Object.keys(trends.byYear).sort();
    if (years.length >= 2) {
        const lastYear = years[years.length - 1];
        const previousYear = years[years.length - 2];
        const lastRate = trends.byYear[lastYear].compliant / trends.byYear[lastYear].total;
        const previousRate = trends.byYear[previousYear].compliant / trends.byYear[previousYear].total;
        trends.improvement = lastRate > previousRate;
    }

    return trends;
}

function identifyRiskFactors(facilities, inspections) {
    return {
        geographicConcentration: calculateGeographicConcentration(facilities),
        inspectionHistory: analyzeInspectionRisk(inspections),
        capacityUtilization: calculateCapacityUtilization(facilities),
        complexityScore: assessManufacturingComplexity(facilities)
    };
}

function calculateGeographicConcentration(facilities) {
    // If no facilities, return maximum risk
    if (!facilities.length) {
        return {
            score: 100,
            risk: 'High',
            details: 'No facility data available'
        };
    }

    // Count facilities by country
    const countryCount = facilities.reduce((acc, facility) => {
        const country = facility.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {});

    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    const totalFacilities = facilities.length;
    const hhi = Object.values(countryCount).reduce((sum, count) => {
        const percentage = (count / totalFacilities) * 100;
        return sum + (percentage * percentage);
    }, 0);

    // Determine risk level based on HHI
    let risk;
    if (hhi > 2500) risk = 'High';
    else if (hhi > 1500) risk = 'Medium';
    else risk = 'Low';

    return {
        score: Math.min(100, Math.round(hhi / 50)), // Normalize to 0-100 scale
        risk,
        details: {
            concentrationIndex: hhi,
            countriesCount: Object.keys(countryCount).length,
            primaryCountry: Object.entries(countryCount)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'
        }
    };
}

function analyzeInspectionRisk(inspections) {
    if (!inspections?.length) {
        return {
            score: 100,
            risk: 'High',
            details: 'No inspection history available'
        };
    }

    // Calculate various risk factors
    const recentInspections = getRecentInspections(inspections);
    const criticalFindings = countCriticalFindings(inspections);
    const repeatFindings = identifyRepeatFindings(inspections);
    const trendsAnalysis = analyzeTrends(inspections);

    // Calculate composite risk score
    const riskScore = calculateInspectionRiskScore({
        recentInspections,
        criticalFindings,
        repeatFindings,
        trendsAnalysis
    });

    return {
        score: riskScore,
        risk: getRiskLevel(riskScore),
        details: {
            recentInspectionsCount: recentInspections.length,
            criticalFindingsCount: criticalFindings.length,
            repeatFindingsCount: repeatFindings.length,
            trend: trendsAnalysis.trend
        }
    };
}

function calculateCapacityUtilization(facilities) {
    if (!facilities?.length) {
        return {
            score: 50, // Neutral score when no data
            risk: 'Medium',
            details: 'No facility capacity data available'
        };
    }

    // Calculate utilization metrics
    const utilization = facilities.map(facility => ({
        facility: facility.name || 'Unknown',
        capacity: estimateFacilityCapacity(facility),
        utilized: estimateUtilization(facility)
    }));

    const averageUtilization = utilization.reduce((sum, facility) => 
        sum + (facility.utilized / facility.capacity), 0) / utilization.length * 100;

    // Assess risk based on utilization
    let risk;
    if (averageUtilization > 90) risk = 'High'; // Over-utilization risk
    else if (averageUtilization < 50) risk = 'Medium'; // Under-utilization risk
    else risk = 'Low'; // Optimal utilization

    return {
        score: Math.round(Math.abs(averageUtilization - 70) * 2), // Distance from optimal (70%)
        risk,
        details: {
            averageUtilization: averageUtilization.toFixed(1) + '%',
            facilitiesAtCapacity: utilization.filter(f => f.utilized / f.capacity > 0.9).length,
            underutilizedFacilities: utilization.filter(f => f.utilized / f.capacity < 0.5).length
        }
    };
}

function assessManufacturingComplexity(facilities) {
    if (!facilities?.length) {
        return {
            score: 50,
            risk: 'Medium',
            details: 'No facility complexity data available'
        };
    }

    // Analyze complexity factors for each facility
    const complexityFactors = facilities.map(facility => ({
        facility: facility.name || 'Unknown',
        productLines: countProductLines(facility),
        processTypes: analyzeProcessTypes(facility),
        automationLevel: assessAutomationLevel(facility),
        specialRequirements: checkSpecialRequirements(facility)
    }));

    // Calculate average complexity score
    const avgComplexity = calculateAverageComplexity(complexityFactors);

    return {
        score: avgComplexity,
        risk: getRiskLevel(avgComplexity),
        details: {
            averageProductLines: average(complexityFactors.map(f => f.productLines)),
            highComplexityFacilities: complexityFactors.filter(f => f.processTypes.complexity === 'High').length,
            specialRequirementFacilities: complexityFactors.filter(f => f.specialRequirements.length > 0).length
        }
    };
}

// Helper functions for inspection risk analysis
function getRecentInspections(inspections, months = 24) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return inspections.filter(inspection => 
        new Date(inspection.inspection_date) >= cutoff
    );
}

function countCriticalFindings(inspections) {
    return inspections.filter(inspection =>
        inspection.findings?.some(finding => 
            finding.severity === 'Critical' || 
            finding.classification === 'Official Action Indicated'
        )
    );
}

function identifyRepeatFindings(inspections) {
    const findingsMap = new Map();
    const repeats = [];

    inspections.forEach(inspection => {
        inspection.findings?.forEach(finding => {
            const key = finding.code || finding.description;
            if (findingsMap.has(key)) {
                repeats.push(finding);
            } else {
                findingsMap.set(key, true);
            }
        });
    });

    return repeats;
}

function analyzeTrends(inspections) {
    const chronological = inspections
        .sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date));

    const trendData = chronological.map(inspection => ({
        date: new Date(inspection.inspection_date),
        score: calculateInspectionScore(inspection)
    }));

    return {
        trend: calculateTrendDirection(trendData),
        latestScore: trendData[trendData.length - 1]?.score || 0
    };
}

// Helper functions for capacity and complexity analysis
function estimateFacilityCapacity(facility) {
    // Simplified capacity estimation based on available facility data
    const baseCapacity = 100;
    const sizeMultiplier = getSizeMultiplier(facility.size);
    const typeMultiplier = getTypeMultiplier(facility.facility_type);
    return baseCapacity * sizeMultiplier * typeMultiplier;
}

function estimateUtilization(facility) {
    // Estimate current utilization based on activity indicators
    return facility.current_activity_level || 
           facility.reported_utilization || 
           70; // Default assumption
}

function countProductLines(facility) {
    return facility.product_lines?.length || 
           facility.manufacturing_activities?.length ||
           1;
}

function analyzeProcessTypes(facility) {
    const processes = facility.manufacturing_processes || [];
    const complexityLevels = processes.map(getProcessComplexity);
    
    return {
        count: processes.length,
        complexity: getMaxComplexity(complexityLevels)
    };
}

function assessAutomationLevel(facility) {
    const indicators = facility.automation_indicators || [];
    const automationScore = indicators.reduce((score, indicator) => {
        return score + getAutomationScore(indicator);
    }, 0);

    return {
        score: automationScore,
        level: getAutomationLevel(automationScore)
    };
}

function checkSpecialRequirements(facility) {
    const requirements = [];
    
    if (facility.sterile_manufacturing) requirements.push('Sterile Manufacturing');
    if (facility.controlled_substances) requirements.push('Controlled Substances');
    if (facility.cold_chain) requirements.push('Cold Chain');
    if (facility.hazardous_materials) requirements.push('Hazardous Materials');

    return requirements;
}

// Utility functions
function getRiskLevel(score) {
    if (score >= 70) return 'High';
    if (score >= 30) return 'Medium';
    return 'Low';
}

function calculateInspectionScore(inspection) {
    const baseScore = 100;
    const findings = inspection.findings || [];
    const deductions = findings.reduce((total, finding) => {
        return total + getFindingSeverityScore(finding);
    }, 0);

    return Math.max(0, baseScore - deductions);
}

function getFindingSeverityScore(finding) {
    const severityScores = {
        'Critical': 30,
        'Major': 20,
        'Minor': 10,
        'Other': 5
    };
    return severityScores[finding.severity] || 5;
}

function calculateAverageComplexity(complexityFactors) {
    return Math.round(complexityFactors.reduce((sum, factor) => {
        return sum + calculateFactorComplexity(factor);
    }, 0) / complexityFactors.length);
}

function calculateFactorComplexity(factor) {
    const scores = {
        productLines: factor.productLines * 10,
        processComplexity: getProcessTypeScore(factor.processTypes.complexity),
        automation: 100 - factor.automationLevel.score,
        specialReqs: factor.specialRequirements.length * 15
    };

    return Math.min(100, Object.values(scores).reduce((a, b) => a + b, 0) / 4);
}

function average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}


function getSizeMultiplier(size) {
    const multipliers = {
        'Large': 2.0,
        'Medium': 1.0,
        'Small': 0.5
    };
    return multipliers[size] || 1.0;
}

function getTypeMultiplier(facilityType) {
    const multipliers = {
        'Manufacturing': 1.0,
        'Packaging': 0.7,
        'Testing': 0.5,
        'Warehouse': 0.3
    };
    return multipliers[facilityType] || 1.0;
}

// Process complexity assessment
function getProcessComplexity(process) {
    const complexityIndicators = {
        high: ['sterile', 'aseptic', 'biological', 'controlled substance'],
        medium: ['semi-solid', 'liquid', 'automated', 'continuous'],
        low: ['packaging', 'labeling', 'storage', 'simple']
    };

    const processLower = process.toLowerCase();
    if (complexityIndicators.high.some(indicator => processLower.includes(indicator))) {
        return 'High';
    }
    if (complexityIndicators.medium.some(indicator => processLower.includes(indicator))) {
        return 'Medium';
    }
    return 'Low';
}

function getMaxComplexity(complexityLevels) {
    const order = ['Low', 'Medium', 'High'];
    return complexityLevels.reduce((max, current) => {
        return order.indexOf(current) > order.indexOf(max) ? current : max;
    }, 'Low');
}

// Automation assessment
function getAutomationScore(indicator) {
    const scores = {
        'Fully Automated': 100,
        'Semi-Automated': 60,
        'Manual with Automation': 30,
        'Fully Manual': 0
    };
    return scores[indicator] || 0;
}

function getAutomationLevel(score) {
    if (score >= 80) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}

function getProcessTypeScore(complexity) {
    const scores = {
        'High': 100,
        'Medium': 60,
        'Low': 30
    };
    return scores[complexity] || 30;
}

function calculateTrendDirection(trendData) {
    if (trendData.length < 2) return 'Stable';
    
    const recentScores = trendData.slice(-3).map(d => d.score);
    const average = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const firstAverage = trendData.slice(0, 3).map(d => d.score)
        .reduce((a, b) => a + b, 0) / 3;

    const difference = average - firstAverage;
    if (difference > 10) return 'Improving';
    if (difference < -10) return 'Declining';
    return 'Stable';
}
function analyzeSafetyProfile(recalls, adverseEvents) {
    return {
        activeRecalls: countActiveRecalls(recalls),
        recallHistory: analyzeRecallHistory(recalls),
        adverseEvents: {
            total: adverseEvents.length,
            byCategory: groupAdverseEventsByCategory(adverseEvents),
            severityDistribution: analyzeSeverityDistribution(adverseEvents)
        },
        riskScore: calculateRiskScore(recalls, adverseEvents),
        responseMetrics: calculateResponseMetrics(recalls)
    };
}

async function buildMarketIntelligence(drugData, labels) {
    const marketShare = await calculateMarketShare(drugData);
    const therapeuticAreas = analyzeTherapeuticAreas(drugData);
    const competitiveAnalysis = await analyzeCompetitiveLandscape(drugData);
    
    return {
        marketShare,
        therapeuticAreas,
        competitiveAnalysis,
        innovationMetrics: calculateInnovationMetrics(drugData),
        growthMetrics: calculateGrowthMetrics(drugData),
        productDiversity: analyzeProductDiversity(labels)
    };
}

// Helper Functions
function groupApplicationsByType(applications) {
    return applications.reduce((acc, app) => {
        const type = app.application_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
}

function getFulfilledValue(result) {
    return result.status === 'fulfilled' ? result.value : [];
}

function getFailedRequests(requests) {
    return requests
        .filter(req => req.result.status === 'rejected')
        .map(req => ({
            source: req.name,
            error: req.result.reason.message,
            timestamp: new Date().toISOString()
        }));
}

function processFacilitiesData(facilities) {
    return facilities.map(facility => ({
        name: facility.name,
        registrationNumber: facility.registration_number,
        address: {
            city: facility.city,
            state: facility.state,
            country: facility.country,
            postalCode: facility.postal_code
        },
        type: facility.facility_type
    }));
}

function getManufacturingLocations(facilities) {
    return facilities.reduce((acc, facility) => {
        const country = facility.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
    }, {});
}

function processSafetyData(recalls) {
    return {
        totalRecalls: recalls.length,
        activeRecalls: recalls.filter(recall => 
            recall.status?.toLowerCase().includes('ongoing')).length,
        bySeverity: recalls.reduce((acc, recall) => {
            const classification = recall.classification || 'Unknown';
            acc[classification] = (acc[classification] || 0) + 1;
            return acc;
        }, {}),
        recentRecalls: recalls
            .sort((a, b) => new Date(b.recall_initiation_date) - new Date(a.recall_initiation_date))
            .slice(0, 5)
    };
}
// Drug Application Analysis Functions
function processDrugData(applications) {
    return {
        total: applications.length,
        activeApplications: countActiveApplications(applications),
        approvedProducts: countApprovedProducts(applications),
        byType: groupApplicationsByType(applications),
        successRate: calculateSuccessRate(applications),
        reviewTimes: calculateReviewTimes(applications),
        therapeuticAreas: analyzeTherapeuticAreas(applications)
    };
}

function countActiveApplications(applications) {
    return applications.filter(app => 
        app.submissions?.[0]?.submission_status?.toLowerCase().includes('pending') ||
        app.submissions?.[0]?.submission_status?.toLowerCase().includes('review')
    ).length;
}

function countApprovedProducts(applications) {
    return applications.filter(app =>
        app.submissions?.some(sub => 
            sub.submission_status?.toLowerCase().includes('approve')
        )
    ).length;
}

function analyzeTherapeuticAreas(applications) {
    const areaMap = applications.reduce((acc, app) => {
        const products = app.products || [];
        products.forEach(product => {
            const area = determineTherapeuticArea(product);
            acc[area] = (acc[area] || 0) + 1;
        });
        return acc;
    }, {});

    return {
        distribution: areaMap,
        primary: findPrimaryArea(areaMap),
        totalAreas: Object.keys(areaMap).length
    };
}

function determineTherapeuticArea(product) {
    // Map product indications to therapeutic areas
    const indication = product.indication_and_usage || '';
    // This is a simplified mapping - you'd want a more comprehensive one
    const areaKeywords = {
        'Cardiovascular': ['heart', 'cardiac', 'cardiovascular', 'blood pressure'],
        'Oncology': ['cancer', 'tumor', 'oncology', 'neoplasm'],
        'Neurology': ['brain', 'neural', 'nervous system', 'neurology'],
        'Respiratory': ['lung', 'respiratory', 'breathing', 'asthma'],
        'Immunology': ['immune', 'antibody', 'immunology', 'autoimmune']
    };

    for (const [area, keywords] of Object.entries(areaKeywords)) {
        if (keywords.some(keyword => indication.toLowerCase().includes(keyword))) {
            return area;
        }
    }

    return 'Other';
}

// Clinical Trial Analysis Functions
function groupTrialsByPhase(trials) {
    return trials.reduce((acc, trial) => {
        const phase = trial.phase || 'Unknown';
        acc[phase] = (acc[phase] || 0) + 1;
        return acc;
    }, {});
}

function calculateTrialCompletionRate(trials) {
    const completed = trials.filter(t => t.overall_status === 'Completed').length;
    return trials.length ? (completed / trials.length * 100).toFixed(1) : 0;
}

function calculateDevelopmentSpeed(trials) {
    const completedTrials = trials.filter(t => t.overall_status === 'Completed');
    const durations = completedTrials.map(trial => {
        const start = new Date(trial.start_date);
        const end = new Date(trial.completion_date);
        return Math.abs(end - start) / (1000 * 60 * 60 * 24 * 30.44); // Convert to months
    }).filter(duration => !isNaN(duration));

    return durations.length ? 
        (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : 0;
}

function calculateEnrollmentMetrics(trials) {
    const activeTrials = trials.filter(t => 
        t.overall_status === 'Recruiting' || 
        t.overall_status === 'Active, not recruiting'
    );

    return {
        totalEnrolled: trials.reduce((sum, t) => sum + (t.enrollment || 0), 0),
        averageEnrollment: calculateAverageEnrollment(trials),
        activeEnrollment: activeTrials.reduce((sum, t) => sum + (t.enrollment || 0), 0),
        byPhase: calculateEnrollmentByPhase(trials)
    };
}

// Market Intelligence Functions
async function calculateMarketShare(drugData) {
    try {
        // Get total market data for comparison
        const marketResponse = await callFDAAPI('drug/drugsfda.json', {
            search: '_exists_:products.brand_name',
            limit: 0
        });

        const totalMarket = marketResponse.meta.results.total;
        const companyTotal = drugData.length;

        return {
            overall: ((companyTotal / totalMarket) * 100).toFixed(2),
            byCategory: calculateCategoryShares(drugData, totalMarket)
        };
    } catch (error) {
        console.warn('Error calculating market share:', error.message);
        return {
            overall: 0,
            byCategory: {}
        };
    }
}

async function analyzeCompetitiveLandscape(drugData) {
    const therapeuticAreas = analyzeTherapeuticAreas(drugData);
    const competitors = {};

    for (const area of Object.keys(therapeuticAreas.distribution)) {
        try {
            const response = await callFDAAPI('drug/drugsfda.json', {
                search: `products.indication_and_usage:"${area}"`,
                limit: 100,
                count: 'sponsor_name.exact'
            });

            competitors[area] = response.results
                .filter(r => r.count > 2) // Only significant competitors
                .slice(0, 5) // Top 5 competitors
                .map(r => ({
                    name: r.term,
                    products: r.count
                }));
        } catch (error) {
            console.warn(`Error analyzing competitors for ${area}:`, error.message);
            competitors[area] = [];
        }
    }

    return {
        competitors,
        competitiveLevels: calculateCompetitiveLevels(competitors)
    };
}

function calculateInnovationMetrics(drugData) {
    const newMolecularEntities = countNewMolecularEntities(drugData);
    const firstInClass = countFirstInClass(drugData);
    const patentExpirations = analyzePatentExpirations(drugData);

    return {
        score: calculateInnovationScore(newMolecularEntities, firstInClass),
        newMolecularEntities,
        firstInClass,
        patentExpirations
    };
}

function calculateGrowthMetrics(drugData) {
    const approvalsByYear = groupApprovalsByYear(drugData);
    const yearOverYear = calculateYearOverYearGrowth(approvalsByYear);
    const projectedGrowth = calculateProjectedGrowth(approvalsByYear);

    return {
        yearOverYear,
        projectedGrowth,
        approvalTrend: approvalsByYear
    };
}

function analyzeProductDiversity(labels) {
    return {
        routesOfAdministration: countRoutes(labels),
        dosageForms: countDosageForms(labels),
        strengthDistribution: analyzeStrengths(labels),
        productCategories: categorizeProducts(labels)
    };
}

// Helper functions for innovation metrics
function countNewMolecularEntities(drugData) {
    return drugData.filter(app => 
        app.application_type?.toLowerCase().includes('nme') ||
        app.application_type?.toLowerCase().includes('new molecular entity')
    ).length;
}

function countFirstInClass(drugData) {
    return drugData.filter(app => 
        app.products?.some(p => 
            p.product_type?.toLowerCase().includes('first in class') ||
            p.approval_history?.some(h => 
                h.description?.toLowerCase().includes('first in class')
            )
        )
    ).length;
}

// Helper functions for growth metrics
function groupApprovalsByYear(drugData) {
    return drugData.reduce((acc, app) => {
        const approvalYear = new Date(app.submissions?.[0]?.submission_status_date).getFullYear();
        if (!isNaN(approvalYear)) {
            acc[approvalYear] = (acc[approvalYear] || 0) + 1;
        }
        return acc;
    }, {});
}

function calculateYearOverYearGrowth(approvalsByYear) {
    const years = Object.keys(approvalsByYear).sort();
    if (years.length < 2) return 0;

    const currentYear = years[years.length - 1];
    const previousYear = years[years.length - 2];
    
    const currentApprovals = approvalsByYear[currentYear] || 0;
    const previousApprovals = approvalsByYear[previousYear] || 0;

    return previousApprovals === 0 ? 100 :
        ((currentApprovals - previousApprovals) / previousApprovals * 100).toFixed(1);
}




function calculateSuccessRate(applications) {
    const completed = applications.filter(app => 
        app.submissions?.some(sub => 
            ['approve', 'complete', 'withdrawn'].some(status => 
                sub.submission_status?.toLowerCase().includes(status)
            )
        )
    );
    
    return completed.length ? {
        rate: (completed.filter(app => 
            app.submissions?.some(sub => 
                sub.submission_status?.toLowerCase().includes('approve')
            )
        ).length / completed.length * 100).toFixed(1),
        total: completed.length
    } : { rate: 0, total: 0 };
}

function calculateReviewTimes(applications) {
    const times = applications
        .filter(app => app.submissions?.length > 0)
        .map(app => {
            const submission = app.submissions[0];
            const submissionDate = new Date(submission.submission_date);
            const approvalDate = new Date(submission.submission_status_date);
            return (approvalDate - submissionDate) / (1000 * 60 * 60 * 24); // Convert to days
        })
        .filter(days => !isNaN(days));

    return {
        average: times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0,
        median: times.length ? calculateMedian(times) : 0,
        min: times.length ? Math.min(...times) : 0,
        max: times.length ? Math.max(...times) : 0
    };
}

function calculateMedian(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
        return ((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1);
    }
    
    return sorted[middle].toFixed(1);
}

// For Therapeutic Areas
function findPrimaryArea(areaMap) {
    return Object.entries(areaMap)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
}

// For Clinical Trials
function calculateAverageEnrollment(trials) {
    const validTrials = trials.filter(t => t.enrollment > 0);
    return validTrials.length ? 
        Math.round(validTrials.reduce((sum, t) => sum + t.enrollment, 0) / validTrials.length) : 0;
}

function calculateEnrollmentByPhase(trials) {
    return trials.reduce((acc, trial) => {
        const phase = trial.phase || 'Unknown';
        acc[phase] = (acc[phase] || 0) + (trial.enrollment || 0);
        return acc;
    }, {});
}

// For Competitive Analysis
function calculateCompetitiveLevels(competitors) {
    return Object.entries(competitors).reduce((acc, [area, comps]) => {
        acc[area] = {
            level: comps.length > 8 ? 'High' : comps.length > 4 ? 'Medium' : 'Low',
            totalCompetitors: comps.length
        };
        return acc;
    }, {});
}

// For Market Share
function calculateCategoryShares(drugData, totalMarket) {
    const areas = analyzeTherapeuticAreas(drugData).distribution;
    return Object.entries(areas).reduce((acc, [area, count]) => {
        acc[area] = ((count / totalMarket) * 100).toFixed(2);
        return acc;
    }, {});
}

// For Patent Analysis
function analyzePatentExpirations(drugData) {
    return drugData.reduce((acc, app) => {
        const patents = app.products?.flatMap(p => p.patents || []) || [];
        patents.forEach(patent => {
            const year = new Date(patent.expiration_date).getFullYear();
            if (!isNaN(year)) {
                acc[year] = (acc[year] || 0) + 1;
            }
        });
        return acc;
    }, {});
}

// For Growth Projections
function calculateProjectedGrowth(approvalsByYear) {
    const years = Object.keys(approvalsByYear).map(Number).sort();
    if (years.length < 3) return null;

    const recentYears = years.slice(-3);
    const values = recentYears.map(year => approvalsByYear[year]);
    const trend = calculateLinearTrend(values);

    return {
        trend: trend.toFixed(1),
        confidence: calculateTrendConfidence(values)
    };
}

function calculateLinearTrend(values) {
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope * 100; // Convert to percentage
}

function calculateTrendConfidence(values) {
    const variations = values.map((val, i, arr) => 
        i > 0 ? Math.abs((val - arr[i-1]) / arr[i-1]) : 0
    ).slice(1);
    
    const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
    return avgVariation < 0.1 ? 'High' : avgVariation < 0.3 ? 'Medium' : 'Low';
}
function countRoutes(labels) {
    return labels.reduce((acc, label) => {
        const route = label.route || 'Unknown';
        acc[route] = (acc[route] || 0) + 1;
        return acc;
    }, {});
}

function countDosageForms(labels) {
    return labels.reduce((acc, label) => {
        const form = label.dosage_form || 'Unknown';
        acc[form] = (acc[form] || 0) + 1;
        return acc;
    }, {});
}

function analyzeStrengths(labels) {
    return labels.reduce((acc, label) => {
        const strength = label.strength || 'Unknown';
        acc[strength] = (acc[strength] || 0) + 1;
        return acc;
    }, {});
}

function categorizeProducts(labels) {
    return labels.reduce((acc, label) => {
        const category = determineProductCategory(label);
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
}

function determineProductCategory(label) {
    // Extract relevant information from the label
    const brandName = label.openfda?.brand_name?.[0]?.toLowerCase() || '';
    const genericName = label.openfda?.generic_name?.[0]?.toLowerCase() || '';
    const productType = label.openfda?.product_type?.[0]?.toLowerCase() || '';
    const route = label.openfda?.route?.[0]?.toLowerCase() || '';
    const pharmaceuticalClass = label.openfda?.pharm_class_epc?.[0]?.toLowerCase() || '';
    const dosageForm = label.dosage_form?.[0]?.toLowerCase() || '';

    // Check for biological products
    if (productType.includes('biologic') || 
        pharmaceuticalClass.includes('monoclonal') ||
        pharmaceuticalClass.includes('antibody') ||
        brandName.includes('mab')) {
        return 'Biological';
    }

    // Check for biosimilars
    if (productType.includes('biosimilar') || brandName.includes('biosimilar')) {
        return 'Biosimilar';
    }

    // Check for vaccines
    if (productType.includes('vaccine') || 
        brandName.includes('vax') || 
        pharmaceuticalClass.includes('vaccine')) {
        return 'Vaccine';
    }

    // Check for combination products
    if (dosageForm.includes('kit') || 
        dosageForm.includes('combination') ||
        brandName.includes('combo')) {
        return 'Combination Product';
    }

    // Check for over-the-counter products
    if (productType.includes('otc') || 
        label.marketing_status?.toLowerCase().includes('otc') ||
        label.openfda?.product_ndc?.some(ndc => ndc.startsWith('otc'))) {
        return 'OTC';
    }

    // Check for specialty drugs
    if (route.includes('implant') || 
        route.includes('injection') ||
        dosageForm.includes('implant') ||
        pharmaceuticalClass.includes('specialty')) {
        return 'Specialty';
    }

    // Check for branded drugs
    if (label.marketing_status?.toLowerCase().includes('brand') ||
        (brandName && !label.openfda?.generic_name)) {
        return 'Brand';
    }

    // Check for generic drugs
    if (label.marketing_status?.toLowerCase().includes('generic') ||
        genericName ||
        !brandName) {
        return 'Generic';
    }

    // Check for medical devices
    if (productType.includes('device') || 
        dosageForm.includes('device') ||
        label.product_category?.toLowerCase().includes('device')) {
        return 'Medical Device';
    }

    // Additional specialized categories
    const specialCategories = {
        'Oncology': ['antineoplastic', 'cancer', 'tumor'],
        'Orphan Drug': ['orphan', 'rare disease'],
        'Controlled Substance': ['schedule', 'controlled', 'narcotic'],
        'Emergency Use': ['emergency', 'temporary authorization']
    };

    for (const [category, keywords] of Object.entries(specialCategories)) {
        if (keywords.some(keyword => 
            pharmaceuticalClass.includes(keyword) ||
            brandName.includes(keyword) ||
            genericName.includes(keyword)
        )) {
            return category;
        }
    }

    // Return Unknown if no other category matches
    return 'Other';
}

// Helper function to group products by therapeutic class
function getTherapeuticClass(label) {
    const pharmClasses = label.openfda?.pharm_class_epc || [];
    const indication = label.indications_and_usage?.[0]?.toLowerCase() || '';

    const therapeuticClasses = {
        'Cardiovascular': ['antihypertensive', 'cardiac', 'cardiovascular', 'heart'],
        'CNS': ['antidepressant', 'antipsychotic', 'nervous system', 'brain'],
        'Respiratory': ['bronchodilator', 'respiratory', 'pulmonary', 'lung'],
        'Gastrointestinal': ['gastrointestinal', 'digestive', 'stomach'],
        'Infectious Disease': ['antibiotic', 'antiviral', 'antimicrobial'],
        'Oncology': ['antineoplastic', 'cancer', 'tumor'],
        'Immunology': ['immunosuppressant', 'immunomodulator', 'immune'],
        'Endocrine': ['hormone', 'diabetes', 'thyroid'],
        'Musculoskeletal': ['muscle', 'bone', 'joint'],
        'Dermatology': ['dermatological', 'skin', 'topical']
    };

    for (const [className, keywords] of Object.entries(therapeuticClasses)) {
        if (keywords.some(keyword => 
            pharmClasses.some(pc => pc.toLowerCase().includes(keyword)) ||
            indication.includes(keyword)
        )) {
            return className;
        }
    }

    return 'Other';
}

// Function to get dosage category
function getDosageCategory(label) {
    const dosageForm = label.dosage_form?.[0]?.toLowerCase() || '';
    const route = label.openfda?.route?.[0]?.toLowerCase() || '';

    const categories = {
        'Oral Solid': ['tablet', 'capsule', 'pill'],
        'Oral Liquid': ['solution', 'suspension', 'syrup'],
        'Injectable': ['injection', 'injectable', 'intravenous'],
        'Topical': ['cream', 'ointment', 'gel', 'patch'],
        'Inhalation': ['inhaler', 'inhalation', 'respiratory'],
        'Implant': ['implant', 'insert'],
        'Ophthalmic': ['eye', 'ophthalmic'],
        'Otic': ['ear', 'otic'],
        'Nasal': ['nasal', 'nose']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => 
            dosageForm.includes(keyword) || route.includes(keyword)
        )) {
            return category;
        }
    }

    return 'Other';
}


//--- Safety Analysis Functions ---//
function countActiveRecalls(recalls) {
    return recalls.filter(recall => 
        recall.status?.toLowerCase().includes('ongoing') ||
        recall.status?.toLowerCase().includes('not terminated')
    ).length;
}

function analyzeRecallHistory(recalls) {
    const sortedRecalls = recalls.sort((a, b) => 
        new Date(b.recall_initiation_date) - new Date(a.recall_initiation_date)
    );

    return {
        timeline: generateRecallTimeline(sortedRecalls),
        byClassification: groupRecallsByClassification(recalls),
        trendsAnalysis: analyzeRecallTrends(recalls)
    };
}

function groupRecallsByClassification(recalls) {
    return recalls.reduce((acc, recall) => {
        const classification = recall.classification || 'Unknown';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
    }, {});
}

function generateRecallTimeline(recalls) {
    return recalls.map(recall => ({
        date: recall.recall_initiation_date,
        product: recall.product_description,
        reason: recall.reason_for_recall,
        classification: recall.classification,
        status: recall.status
    }));
}

function analyzeRecallTrends(recalls) {
    const recallsByYear = groupRecallsByYear(recalls);
    return {
        yearlyTotals: recallsByYear,
        trend: calculateRecallTrend(recallsByYear),
        severityProgression: analyzeSeverityProgression(recalls)
    };
}

function groupRecallsByYear(recalls) {
    return recalls.reduce((acc, recall) => {
        const year = new Date(recall.recall_initiation_date).getFullYear();
        if (!isNaN(year)) {
            acc[year] = (acc[year] || 0) + 1;
        }
        return acc;
    }, {});
}

//--- Adverse Events Analysis Functions ---//
function groupAdverseEventsByCategory(events) {
    return events.reduce((acc, event) => {
        const category = determineEventCategory(event);
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
}

function determineEventCategory(event) {
    // Map reaction terms to broader categories
    const reaction = event.patient?.reaction?.[0]?.reactionmeddrapt?.toLowerCase() || '';
    
    const categoryMap = {
        'Cardiovascular': ['heart', 'cardiac', 'cardiovascular', 'arrhythmia'],
        'Neurological': ['brain', 'neural', 'seizure', 'headache'],
        'Gastrointestinal': ['stomach', 'intestinal', 'nausea', 'vomiting'],
        'Respiratory': ['lung', 'breathing', 'respiratory', 'asthma'],
        'Dermatological': ['skin', 'rash', 'itching', 'dermatitis']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => reaction.includes(keyword))) {
            return category;
        }
    }

    return 'Other';
}

function analyzeSeverityDistribution(events) {
    return events.reduce((acc, event) => {
        const severity = determineSeverity(event);
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
    }, {});
}

function determineSeverity(event) {
    const outcome = event.patient?.reaction?.[0]?.reactionoutcome;
    const seriousness = event.serious;

    if (outcome === '1' || outcome === '2') return 'Mild';
    if (outcome === '3') return 'Moderate';
    if (outcome === '4' || outcome === '5' || seriousness) return 'Severe';
    return 'Unknown';
}

//--- Risk Analysis Functions ---//
function calculateRiskScore(recalls, adverseEvents) {
    const recallScore = calculateRecallRiskScore(recalls);
    const adverseEventScore = calculateAdverseEventRiskScore(adverseEvents);
    
    // Weighted average of recall and adverse event scores
    return Math.round((recallScore * 0.6) + (adverseEventScore * 0.4));
}

function calculateRecallRiskScore(recalls) {
    const classificationWeights = {
        'Class I': 1.0,
        'Class II': 0.6,
        'Class III': 0.3
    };

    const weightedSum = recalls.reduce((sum, recall) => {
        const weight = classificationWeights[recall.classification] || 0.5;
        return sum + weight;
    }, 0);

    // Normalize score to 0-100 range
    return Math.min(100, Math.round((weightedSum / recalls.length) * 100)) || 0;
}

function calculateAdverseEventRiskScore(events) {
    const severityWeights = {
        'Severe': 1.0,
        'Moderate': 0.6,
        'Mild': 0.3,
        'Unknown': 0.5
    };

    const weightedSum = events.reduce((sum, event) => {
        const severity = determineSeverity(event);
        const weight = severityWeights[severity];
        return sum + weight;
    }, 0);

    // Normalize score to 0-100 range
    return Math.min(100, Math.round((weightedSum / events.length) * 100)) || 0;
}

function calculateResponseMetrics(recalls) {
    const responseData = recalls.map(recall => ({
        timeToAction: calculateTimeToAction(recall),
        timeToResolution: calculateTimeToResolution(recall),
        communicationScore: evaluateCommunication(recall)
    })).filter(data => data.timeToAction !== null);

    return {
        averageTimeToAction: calculateAverage(responseData.map(d => d.timeToAction)),
        averageTimeToResolution: calculateAverage(responseData.map(d => d.timeToResolution)),
        communicationEffectiveness: calculateAverage(responseData.map(d => d.communicationScore))
    };
}

function calculateTimeToAction(recall) {
    const reportDate = new Date(recall.report_date);
    const actionDate = new Date(recall.recall_initiation_date);
    
    if (isNaN(reportDate.getTime()) || isNaN(actionDate.getTime())) {
        return null;
    }

    return Math.round((actionDate - reportDate) / (1000 * 60 * 60 * 24));
}

function calculateTimeToResolution(recall) {
    const startDate = new Date(recall.recall_initiation_date);
    const endDate = recall.termination_date ? new Date(recall.termination_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return null;
    }

    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

function evaluateCommunication(recall) {
    let score = 0;
    
    // Check for presence of key communication elements
    if (recall.reason_for_recall) score += 30;
    if (recall.product_description) score += 20;
    if (recall.distribution_pattern) score += 20;
    if (recall.recall_number) score += 15;
    if (recall.classification) score += 15;

    return score;
}

function calculateAverage(numbers) {
    const validNumbers = numbers.filter(n => n !== null && !isNaN(n));
    return validNumbers.length ? 
        Math.round(validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length) : 0;
}


// Enhanced FDA Filings API endpoint
app.post('/api/company-fda-filings', async (req, res) => {
    const { companyName } = req.body;
    
    if (!companyName) {
        return res.status(400).json({ error: 'Company name is required' });
    }
    
    try {
        // First, try to get a list of all sponsor names to find potential matches
        const sponsorResponse = await axios.get('https://api.fda.gov/drug/drugsfda.json', {
            params: {
                api_key: process.env.FDA_API_KEY,
                search: '_exists_:sponsor_name',
                limit: 1000,
                count: 'sponsor_name'
            }
        });

        // Find potential company matches
        const companyNameLower = companyName.toLowerCase();
        const potentialMatches = sponsorResponse.data.results
            .filter(result => result.term.toLowerCase().includes(companyNameLower))
            .map(result => result.term);

        if (potentialMatches.length === 0) {
            return res.json({
                company: companyName,
                filings: [],
                totalFilings: 0,
                message: 'No exact or similar company names found. Please verify the company name.'
            });
        }

        // Build search query with all potential matches
        const searchQuery = potentialMatches
            .map(match => `sponsor_name:"${match}"`)
            .join(' OR ');

        // Fetch filings for all potential matches
        const filingsResponse = await axios.get('https://api.fda.gov/drug/drugsfda.json', {
            params: {
                api_key: process.env.FDA_API_KEY,
                search: `(${searchQuery}) AND _exists_:submissions.submission_status_date`,
                limit: 100,
                sort: 'submissions.submission_status_date:desc'
            }
        });
        
        const filings = filingsResponse.data.results.map(filing => ({
            // Basic filing info

            company: filing.sponsor_name,
            productName: filing.products?.[0]?.brand_name || 'N/A',
            type: filing.submissions[0]?.submission_type || 'N/A',
            date: filing.submissions[0]?.submission_status_date || 'N/A',
            status: filing.submissions[0]?.submission_status || 'Pending',
            id: filing.application_number,
            allSubmissions: filing.submissions.map(sub => ({
                type: sub.submission_type,
                date: sub.submission_status_date,
                status: sub.submission_status
            }))
        }));

        // Group filings by exact company name
        const filingsByCompany = {};
        filings.forEach(filing => {
            if (!filingsByCompany[filing.company]) {
                filingsByCompany[filing.company] = [];
            }
            filingsByCompany[filing.company].push(filing);
        });
        
        res.json({
            searchedCompany: companyName,
            matchedCompanies: Object.keys(filingsByCompany),
            filingsByCompany: filingsByCompany,
            totalFilings: filings.length
        });
        
    } catch (error) {
        console.error('FDA API Error:', error.response?.data || error.message);
        
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'FDA API rate limit exceeded. Please try again later.' });
        }
        
        if (error.response?.status === 403) {
            return res.status(403).json({ error: 'Invalid FDA API key' });
        }

        // Special handling for "No matches found"
        if (error.response?.data?.error?.code === 'NOT_FOUND') {
            return res.json({
                company: companyName,
                filings: [],
                totalFilings: 0,
                message: 'No filings found for this company. Please verify the company name.'
            });
        }
        
        res.status(500).json({ 
            error: 'Error fetching FDA filings',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

// Helper function for common FDA API calls
const makeFDARequestc = async (endpoint, searchParams, apiKey) => {
    try {
        const response = await axios.get(`https://api.fda.gov/${endpoint}`, {
            params: {
                api_key: apiKey,
                ...searchParams
            }
        });
        return response.data;
    } catch (error) {
        throw handleFDAError(error);
    }
};

// Error handler for FDA API responses
const handleFDAError = (error) => {
    if (error.response?.status === 429) {
        const err = new Error('FDA API rate limit exceeded');
        err.status = 429;
        throw err;
    }
    if (error.response?.status === 403) {
        const err = new Error('Invalid FDA API key');
        err.status = 403;
        throw err;
    }
    if (error.response?.data?.error?.code === 'NOT_FOUND') {
        return { results: [], total: 0 };
    }
    throw error;
};

// Device Pre-market Approval (PMA) search
async function searchDevicePMA(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }
    
    // Get all applicant names for matching
    const applicantResponse = await makeFDARequest('device/pma.json', {
        search: '_exists_:applicant',
        limit: 1000,
        count: 'applicant'
    }, apiKey);

    const companyNameLower = companyName.toLowerCase();
    const potentialMatches = applicantResponse.results
        .filter(result => result.term.toLowerCase().includes(companyNameLower))
        .map(result => result.term);

    if (potentialMatches.length === 0) {
        return {
            company: companyName,
            approvals: [],
            totalApprovals: 0
        };
    }

    const searchQuery = potentialMatches
        .map(match => `applicant:"${match}"`)
        .join(' OR ');

    const pmaResponse = await makeFDARequest('device/pma.json', {
        search: `(${searchQuery})`,
        limit: 100,
        sort: 'decision_date:desc'
    }, apiKey);

    const approvals = pmaResponse.results.map(pma => ({
        company: pma.applicant,
        deviceName: pma.device_name || 'N/A',
        pmaNumber: pma.pma_number,
        decisionDate: pma.decision_date,
        decisionCode: pma.decision_code,
        productCode: pma.product_code,
        genericName: pma.generic_name,
        expeditedReview: pma.expedited_review_flag === 'Y'
    }));

    return {
        searchedCompany: companyName,
        matchedCompanies: [...new Set(approvals.map(a => a.company))],
        approvals,
        totalApprovals: approvals.length
    };
}

// Device 510(k) Clearances search
async function searchDevice510k(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }
    
    const applicantResponse = await makeFDARequest('device/510k.json', {
        search: '_exists_:applicant',
        limit: 1000,
        count: 'applicant'
    }, apiKey);

    const companyNameLower = companyName.toLowerCase();
    const potentialMatches = applicantResponse.results
        .filter(result => result.term.toLowerCase().includes(companyNameLower))
        .map(result => result.term);

    if (potentialMatches.length === 0) {
        return {
            company: companyName,
            clearances: [],
            totalClearances: 0
        };
    }

    const searchQuery = potentialMatches
        .map(match => `applicant:"${match}"`)
        .join(' OR ');

    const clearanceResponse = await makeFDARequest('device/510k.json', {
        search: `(${searchQuery})`,
        limit: 100,
        sort: 'decision_date:desc'
    }, apiKey);

    const clearances = clearanceResponse.results.map(k510 => ({
        company: k510.applicant,
        deviceName: k510.device_name || 'N/A',
        k510Number: k510.k_number,
        decisionDate: k510.decision_date,
        decisionCode: k510.decision_code,
        productCode: k510.product_code,
        reviewAdviceCommittee: k510.review_advisory_committee,
        regulatoryClass: k510.regulatory_class
    }));

    return {
        searchedCompany: companyName,
        matchedCompanies: [...new Set(clearances.map(c => c.company))],
        clearances,
        totalClearances: clearances.length
    };
}

// Device Adverse Events search
async function searchDeviceAdverseEvents(companyName, dateRange, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }
    
    const searchQuery = `manufacturer_d_name:"${companyName}"`;
    const dateFilter = dateRange ? 
        `AND date_received:[${dateRange.start} TO ${dateRange.end}]` : '';

    const adverseEventsResponse = await makeFDARequest('device/event.json', {
        search: `${searchQuery} ${dateFilter}`,
        limit: 100,
        sort: 'date_received:desc'
    }, apiKey);

    const events = adverseEventsResponse.results.map(event => ({
        company: event.manufacturer_d_name,
        eventDate: event.date_received,
        deviceType: event.device_name || 'N/A',
        eventType: event.event_type,
        reportNumber: event.mdr_report_key,
        patientOutcome: event.patient_outcome,
        deviceProblem: event.device_problem_codes?.join(', '),
        manufacturerEvaluation: event.manufacturer_evaluation_conclusion,
        initialReport: event.type_of_report[0] === 'Initial'
    }));

    return {
        company: companyName,
        events,
        totalEvents: events.length
    };
}

// Device Recalls search
async function searchDeviceRecalls(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }
    
    const searchQuery = `firm_fei_number:"${companyName}" OR firm_name:"${companyName}"`;

    const recallsResponse = await makeFDARequest('device/recall.json', {
        search: searchQuery,
        limit: 100,
        sort: 'recall_initiation_date:desc'
    }, apiKey);

    const recalls = recallsResponse.results.map(recall => ({
        company: recall.firm_name,
        recallNumber: recall.recall_number,
        initiationDate: recall.recall_initiation_date,
        status: recall.status,
        classification: recall.classification,
        productDescription: recall.product_description,
        reason: recall.reason_for_recall,
        quantity: recall.quantity_in_commerce,
        distribution: recall.distribution_pattern
    }));

    return {
        company: companyName,
        recalls,
        totalRecalls: recalls.length
    };
}

// NDC Directory search
async function searchNDCDirectory(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }

    const searchQuery = `labeler_name:"${companyName}"`;
    
    const ndcResponse = await makeFDARequest('drug/ndc.json', {
        search: searchQuery,
        limit: 100
    }, apiKey);

    const products = ndcResponse.results.map(product => ({
        company: product.labeler_name,
        productName: product.brand_name || product.generic_name,
        productNDC: product.product_ndc,
        productType: product.product_type,
        route: product.route,
        dosageForm: product.dosage_form,
        strength: product.active_ingredients?.map(i => `${i.name} ${i.strength}`).join(', '),
        marketing_status: product.marketing_status,
        packaging: product.packaging
    }));

    return {
        company: companyName,
        products,
        totalProducts: products.length
    };
}

// Drug Product Labeling search
async function searchDrugLabeling(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }

    const searchQuery = `openfda.manufacturer_name:"${companyName}"`;
    
    const labelingResponse = await makeFDARequest('drug/label.json', {
        search: searchQuery,
        limit: 100
    }, apiKey);

    const labels = labelingResponse.results.map(label => ({
        company: label.openfda?.manufacturer_name?.[0] || companyName,
        brandName: label.openfda?.brand_name?.[0],
        genericName: label.openfda?.generic_name?.[0],
        productType: label.openfda?.product_type?.[0],
        route: label.openfda?.route?.[0],
        indications: label.indications_and_usage?.[0],
        warnings: label.warnings?.[0],
        adverseReactions: label.adverse_reactions?.[0],
        effectiveDate: label.effective_time
    }));

    return {
        company: companyName,
        labels,
        totalLabels: labels.length
    };
}

// Device Registration and Listings search
async function searchDeviceRegistration(companyName, apiKey) {
    if (!companyName) {
        throw new Error('Company name is required');
    }

    const searchQuery = `firm_name:"${companyName}"`;
    
    const registrationResponse = await makeFDARequest('device/registrationlisting.json', {
        search: searchQuery,
        limit: 100
    }, apiKey);

    const registrations = registrationResponse.results.map(reg => ({
        company: reg.firm_name,
        registrationNumber: reg.registration_number,
        feiNumber: reg.fei_number,
        address: {
            street: reg.firm_address_line_1,
            city: reg.firm_city,
            state: reg.firm_state,
            country: reg.firm_country_code,
            postalCode: reg.firm_postal_code
        },
        deviceListings: reg.device_listings?.map(listing => ({
            productCode: listing.product_code,
            deviceName: listing.device_name,
            deviceClass: listing.device_class
        }))
    }));

    return {
        company: companyName,
        registrations,
        totalRegistrations: registrations.length
    };
}

// UDI (Unique Device Identifier) search
async function searchUDI(searchTerm, searchType, apiKey) {
    if (!searchTerm) {
        throw new Error('Search term is required');
    }

    let searchQuery;
    switch (searchType) {
        case 'company':
            searchQuery = `company_name:"${searchTerm}"`;
            break;
        case 'device':
            searchQuery = `device_name:"${searchTerm}"`;
            break;
        case 'identifier':
            searchQuery = `identifier_id:"${searchTerm}"`;
            break;
        default:
            searchQuery = `device_name:"${searchTerm}" OR company_name:"${searchTerm}"`;
    }
    
    const udiResponse = await makeFDARequest('device/udi.json', {
        search: searchQuery,
        limit: 100
    }, apiKey);

    const devices = udiResponse.results.map(device => ({
        company: device.company_name,
        deviceName: device.device_name,
        deviceDescription: device.device_description,
        brandName: device.brand_name,
        versionModel: device.version_or_model_number,
        primaryDI: device.primary_di_number,
        productCodes: device.product_codes,
        gmdnTerms: device.gmdn_terms?.map(term => ({
            name: term.name,
            definition: term.definition
        }))
    }));

    return {
        searchTerm,
        devices,
        totalDevices: devices.length
    };
}

// Device Classification search
async function searchDeviceClassification(searchTerm, apiKey) {
    if (!searchTerm) {
        throw new Error('Search term is required');
    }

    const searchQuery = `device_name:"${searchTerm}" OR product_code:"${searchTerm}"`;
    
    const classificationResponse = await makeFDARequest('device/classification.json', {
        search: searchQuery,
        limit: 100
    }, apiKey);

    const classifications = classificationResponse.results.map(classification => ({
        deviceName: classification.device_name,
        productCode: classification.product_code,
        medicalSpecialty: classification.medical_specialty,
        regulationNumber: classification.regulation_number,
        deviceClass: classification.device_class,
        implant: classification.implant_flag === 'Y',
        lifeSupporting: classification.life_sustain_support_flag === 'Y',
        regulationType: classification.regulation_type,
        reviewPanel: classification.review_panel,
        definition: classification.definition,
        physicalState: classification.physical_state
    }));

    return {
        searchTerm,
        classifications,
        totalClassifications: classifications.length
    };
}



// Helper function for FDA API calls
async function makeFDARequest(name, endpoint, searchParams) {
    const defaultParams = {
        sort: 'report_date:desc',  // Sort by report date descending
        limit: 1                   // Limit to most recent result
    };
    const params = new URLSearchParams({
        api_key: process.env.FDA_API_KEY,
        ...defaultParams,
        ...searchParams
    });

    try {
        console.log(`\n=== Testing ${name} ===`);
        const response = await fetch(`https://api.fda.gov/${endpoint}?${params}`);
        console.log(`Status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`FDA API Error: ${response.status}`);
        }
        
        const data = await response.json();
        // console.log(JSON.stringify(data, null, 2));
        return data.results;
    } catch (error) {
        console.error(`Error testing ${name}:`, error.message);
        return null;
    }
}

// Test all endpoints
// async function testAllEndpoints() {

app.post('/api/fda', async (req, res) => {
        const { companyName } = req.body;
        
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        console.log(companyName)
        
        try {
    
    const COMPANY = companyName
    const companyVariants = await getCompanyVariants(companyName);
    const [ drugData, recalls ] = await Promise.allSettled([  
        fetchDrugApplications(companyVariants),
        fetchRecalls(companyVariants),
        ])

    // 1. Device PMAyes
   const pma =  await makeFDARequest('Device PMA', 'device/pma.json', {
        search: `applicant:"${COMPANY}"`,
        limit: 3
    });

    // 2. 510(k)
    const device501k = await makeFDARequest('510(k)', 'device/510k.json', {
        search: `applicant:"${COMPANY}"`,
        limit: 3
    });

    const udi = await makeFDARequest('UDI', 'device/udi.json', {
        search: `company_name:"${COMPANY}"`,
        limit: 3
    });

    res.json({
        pma : pma,
        d501k : device501k,
        udi : udi,
        drug : drugData.value,
        recalls : recalls.value
    })
} catch (error) {
    console.error(`Error `, error.message);
    res.status(500).json({ error: error.message });
}
});

// const API_KEY = 'd3eilgqyIfLBNLFPCKC9fctn826xmw6B91HWKPkO';
// Run all tests


    // 3. Device Adverse Events no
    // await makeFDARequest('Device Adverse Events', 'device/event.json', {
    //     search: `manufacturer_d_name:"${COMPANY}"`,
    //     limit: 3
    // });

    // // // 4. Device Recalls mp
    // await makeFDARequest('Device Recalls', 'device/enforcement.json', {
    //     search: `firm_name:"${COMPANY}"`,
    //     limit: 3
    // });

    // 5. NDC Directory n
    // await makeFDARequest('NDC Directory', 'drug/ndc.json', {
    //     search: `labeler_name:"${COMPANY}"`,
    //     limit: 3
    // });

    // 6. Drug Labeling n
    // await makeFDARequest('Drug Labeling', 'drug/label.json', {
    //     search: `openfda.manufacturer_name:"${COMPANY}"`,
    //     limit: 3
    // });

    // 7. Device Registration n
    // await makeFDARequest('Device Registration', 'device/registrationlisting.json', {
    //     search: `firm_name:"${COMPANY}"`,
    //     limit: 3
    // });

    // 8. UDI yes

    // 9. Device Classification n
//     await makeFDARequest('Device Classification', 'device/classification.json', {
//         search: `device_name:"${COMPANY}"`,
//         limit: 3
//     });



// Helper functions
function getCategoryBreakdown(patents) {
    return {
        utility: patents.filter(p => p.patent_type === 'utility').length,
        design: patents.filter(p => p.patent_type === 'design').length,
        plant: patents.filter(p => p.patent_type === 'plant').length
    };
}

function getFilingTrends(patents) {
    return groupBy(patents, p => new Date(p.patent_date).getMonth());
}

function getPatentStatus(patentKind) {
    const statusMap = {
        'A1': 'Pending',
        'B1': 'Granted',
        'B2': 'Reissued',
        'S1': 'Design'
    };
    return statusMap[patentKind] || 'Unknown';
}

function getSubmissionTypeBreakdown(filings) {
    return groupBy(filings, f => f.submissions[0]?.submission_type);
}

function calculateApprovalTimeline(filings) {
    return filings.map(f => ({
        applicationNumber: f.application_number,
        submissionDate: f.submissions[0]?.submission_status_date,
        approvalDate: f.submissions[0]?.submission_status === 'AP' ? 
            f.submissions[0]?.submission_status_date : null,
        timeToApproval: calculateDuration(
            f.submissions[0]?.submission_status_date,
            f.submissions[0]?.approval_date
        )
    }));
}

function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return null;
    return Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
}













// News API endpoint
app.post('/api/news', async (req, res) => {
    const { keywords, industry } = req.body;
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: `${keywords.join(' OR ')} ${industry}`,
                // q: `3M CO`,
                language: 'en',
                sortBy: 'publishedAt',
                pageSize: 10,
                apiKey: process.env.NEWS_API_KEY
            }
        });

        const news = response.data.articles.map(article => ({
            title: article.title,
            description: article.description,
            source: article.source.name,
            date: article.publishedAt,
            url: article.url
        }));
console.log(news)
        res.json(news);
    } catch (error) {
        console.error('News API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error fetching news' });
    }
});



// Patents API endpoint
// Middleware to handle API errors
const handleApiError = (error, res) => {
    console.error('API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
        error: 'API Error', 
        message: error.message,
        details: error.response?.data 
    });
};
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


app.post('/api/patents', async (req, res) => {
    const { industry, competitors } = req.body;
  try {
    const url = 'https://api.patentsview.org/patents/query';
    
    const requestBody = {
       q: { "_and": [
            {
              "_gte": {
                "patent_date": "2021-01-01"
              }
            },
            {
              "_lte": {
                "patent_date": "2021-12-27"
              }
            }
          ]
        },
        // q:{"_and":
        //     [{"_gte":{"patent_date":"2021-12-27"}},{"_lte":{"patent_date":"2020-12-27"}}]
        // },
    //   q: 
    //     // _and: [
    //       {
    //         "_gte":{"patent_date":"2007-01-09", "assignee_organization": true}}
    //       //   _gte: {
    //       //     patent_date: "2024-01-01",
    //       //     assignee_organization: true
    //       //   }
    //       // }

    //     // ]
    //   ,
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
      per_page: 1,
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
      console.log(patent.patent_date)
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



// FDA Filings API endpoint
app.post('/api/fda-filings', async (req, res) => {
    const { industry } = req.body;
    
    // Only fetch FDA filings for healthcare industry
    if (industry !== 'Healthcare') {
        return res.json([]);
    }

    try {
        const response = await axios.get('https://api.fda.gov/drug/drugsfda.json', {
            params: {
                api_key: process.env.FDA_API_KEY,
                search: `_exists_:submissions.submission_status_date`,
                limit: 10,
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
        console.error('FDA API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error fetching FDA filings' });
    }
});

// Funding Rounds API endpoint (Crunchbase)
app.post('/api/funding-rounds', async (req, res) => {
    const { industry } = req.body;
    try {
        const response = await axios.post(
            'https://api.crunchbase.com/api/v4/searches/organizations',
            {
                field_ids: [
                    "identifier",
                    "name",
                    "short_description",
                    // "funding_total",
                    // "funding_rounds",
                    // "last_funding_date",
                    // "categories",
                    // "website",
                    // "founded_on"
                ],
                query: [
                    {
                        type: "predicate",
                        field_id: "facet_ids",
                        operator_id: "includes",
                        values: ["company"]
                    }
                    // {
                    //     type: "predicate",
                    //     field_id: "categories",
                    //     operator_id: "includes",
                    //     values: [industry.toLowerCase()]
                    // }
                ],
                limit: 10
            },
            {
                headers: {
                    'X-cb-user-key': process.env.CRUNCHBASE_API_KEY
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
            website: org.properties.website?.url || '#',
            lastFunding: org.properties.last_funding_date,
            categories: org.properties.categories || []
        }));

        res.json(companies);
    } catch (error) {
        console.error('Crunchbase API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error fetching funding data' });
    }
});

// FCC Submissions endpoint
app.get('/api/fcc-submissions', async (req, res) => {
    try {
        const response = await axios.get('https://www.fcc.gov/news-events/daily-digest.xml', {
            timeout: 10000,
            maxRedirects: 3,
            headers: {
                'Accept': 'application/xml, application/rss+xml',
                'User-Agent': 'IndustryDashboard/1.0'
            },
            responseType: 'text'
        });

        const parser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            trimValues: true
        });

        const result = parser.parse(response.data);
        const items = result?.rss?.channel?.item || [];
        
        const submissions = (Array.isArray(items) ? items : [items])
            .slice(0, 10)
            .map(item => ({
                title: item.title || 'No Title',
                type: 'Daily Digest Entry',
                date: item.pubDate || item['dc:date'] || new Date().toISOString(),
                status: 'Published',
                id: item.guid || item.link,
                link: item.link
            }));

        res.json(submissions);
    } catch (error) {
        console.error('FCC Feed Error:', error);
        res.status(500).json({ error: 'Error fetching FCC submissions' });
    }
});

// Combined industry data endpoint
app.post('/api/industry-data', async (req, res) => {
    const { client, industry } = req.body;
    
    try {
        const [news, patents, fdaFilings, fundingRounds, fccSubmissions] = await Promise.all([
            axios.post('/api/news', { industry }),
            axios.post('/api/patents', { industry }),
            axios.post('/api/fda-filings', { industry }),
            axios.post('/api/funding-rounds', { industry }),
            axios.get('/api/fcc-submissions')
        ]);

        res.json({
            news: news.data,
            patents: patents.data,
            fdaFilings: fdaFilings.data,
            fundingRounds: fundingRounds.data,
            fccSubmissions: fccSubmissions.data
        });
    } catch (error) {
        console.error('Industry Data Error:', error);
        res.status(500).json({ error: 'Error fetching industry data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});



class SECDataFetcher {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://data.sec.gov/api/xbrl/companyfacts';
        this.headers = {
            'User-Agent': 'Company Name admin@company.com',
            'Accept-Encoding': 'gzip, deflate',
            'Host': 'data.sec.gov'
        };
    }

    async fetchCompanyData(cik) {
        const formattedCik = cik.toString().padStart(10, '0');
        
        try {
            // Fetch basic company information
            const companyData = await this.makeRequest(`${this.baseUrl}/CIK${formattedCik}.json`);
            const filings = await this.fetchLatestFilings(formattedCik);
            const metrics = await this.extractMetrics(companyData);
            const filingAnalysis = this.analyzeFilings(filings);
            
            return {
                metrics,
                filings: filingAnalysis,
                success: true
            };
        } catch (error) {
            console.error('Error fetching company data:');
            return {
                success: false,
                error: error.message
            };
        }
    }

    async extractMetrics(data) {
        try {
            const metrics = {
                revenue: await this.extractRevenue(data),
                marketCap: await this.extractMarketCap(data),
                rdExpense: await this.extractRDExpense(data),
                operatingMetrics: await this.extractOperatingMetrics(data),
                financialHealth: await this.extractFinancialHealth(data),
                shareholderMetrics: await this.extractShareholderMetrics(data)
            };
            return metrics;
        } catch (error) {
            console.error('Error extracting metrics:');
            return null;
        }
    }

    async extractOperatingMetrics(data) {
        try {
            return {
                operatingIncome: this.extractValue(data, 'OperatingIncomeLoss'),
                operatingMargin: this.extractValue(data, 'OperatingIncomeLoss') / this.extractValue(data, 'Revenues'),
                grossProfit: this.extractValue(data, 'GrossProfit'),
                employeeCount: this.extractValue(data, 'EntityNumberOfEmployees'),
                segmentRevenue: this.extractValue(data, 'SegmentRevenueFromExternalCustomers')
            };
        } catch (error) {
            console.error('Error extracting operating metrics:');
            return null;
        }
    }

    async extractFinancialHealth(data) {
        try {
            return {
                currentAssets: this.extractValue(data, 'AssetsCurrent'),
                currentLiabilities: this.extractValue(data, 'LiabilitiesCurrent'),
                totalDebt: this.extractValue(data, 'DebtInstrumentCarryingAmount'),
                cashAndEquivalents: this.extractValue(data, 'CashAndCashEquivalentsAtCarryingValue'),
                freeCashFlow: this.extractValue(data, 'NetCashProvidedByUsedInOperatingActivities') -
                             this.extractValue(data, 'PaymentsToAcquirePropertyPlantAndEquipment')
            };
        } catch (error) {
            console.error('Error extracting financial health metrics:');
            return null;
        }
    }

    async extractShareholderMetrics(data) {
        try {
            return {
                dividendsPaid: this.extractValue(data, 'PaymentsOfDividends'),
                shareRepurchases: this.extractValue(data, 'PaymentsForRepurchaseOfCommonStock'),
                earningsPerShare: this.extractValue(data, 'EarningsPerShareBasic'),
                shareholdersEquity: this.extractValue(data, 'StockholdersEquity')
            };
        } catch (error) {
            console.error('Error extracting shareholder metrics:');
            return null;
        }
    }

    extractValue(data, conceptName) {
        try {
            const concept = data.facts['us-gaap'][conceptName];
            if (!concept) return null;

            const values = concept.units.USD || concept.units.USD;
            if (!values || !values.length) return null;

            return values.sort((a, b) => new Date(b.end) - new Date(a.end))[0].val;
        } catch (error) {
            return null;
        }
    }
    analyzeFilings(filingData) {
        const filingsAnalysis = {
            recent: {
                '10-K': [],
                '10-Q': [],
                '8-K': [],
                'DEF 14A': []
            },
            filingStats: {
                totalFilings: 0,
                lastQuarterFilings: 0,
                significantEvents: []
            },
            latestDates: {
                lastAnnualReport: null,
                lastQuarterlyReport: null,
                lastMaterialEvent: null
            }
        };

        if (!filingData || !filingData.primaryDocument) {
            return filingsAnalysis;
        }

        // Track unique forms we've found
        const formCounts = {
            '10-K': 0,
            '10-Q': 0,
            '8-K': 0,
            'DEF 14A': 0
        };

        // Process each filing
        const last90Days = new Date();
        last90Days.setDate(last90Days.getDate() - 90);

        // Process each filing
        for (let i = 0; i < filingData.primaryDocument.length; i++) {
            const doc = filingData.primaryDocument[i];
            const description = filingData.primaryDocDescription[i];
            const type = filingData.core_type[i];
            const size = filingData.size[i];
            const items = filingData.items[i];
            const isXBRL = filingData.isXBRL[i] === 1;

            // Skip empty entries
            if (!doc || !type) continue;

            const filing = {
                documentName: doc,
                description: description || '',
                type: type,
                size: size || 0,
                items: items || '',
                isXBRL: isXBRL
            };

            // Categorize filings based on core_type and form patterns
            if ((type === '10-K' || doc.includes('10-k')) && formCounts['10-K'] < 5) {
                filingsAnalysis.recent['10-K'].push(filing);
                formCounts['10-K']++;
                if (!filingsAnalysis.latestDates.lastAnnualReport) {
                    filingsAnalysis.latestDates.lastAnnualReport = new Date().toISOString();
                }
            } else if ((type === '10-Q' || doc.includes('10-q')) && formCounts['10-Q'] < 5) {
                filingsAnalysis.recent['10-Q'].push(filing);
                formCounts['10-Q']++;
                if (!filingsAnalysis.latestDates.lastQuarterlyReport) {
                    filingsAnalysis.latestDates.lastQuarterlyReport = new Date().toISOString();
                }
            } else if (type === '8-K' || doc.includes('8-k')) {
                if (formCounts['8-K'] < 5) {
                    filingsAnalysis.recent['8-K'].push(filing);
                    formCounts['8-K']++;
                }
                if (!filingsAnalysis.latestDates.lastMaterialEvent) {
                    filingsAnalysis.latestDates.lastMaterialEvent = new Date().toISOString();
                }
                
                // Analyze 8-K items for significant events
                if (items) {
                    const itemsList = items.split(',');
                    const significantItems = {
                        '1.01': 'Material Agreement',
                        '2.01': 'Asset Acquisition/Disposition',
                        '2.02': 'Financial Results',
                        '5.02': 'Management Changes',
                        '5.07': 'Submission of Matters to Vote',
                        '7.01': 'Regulation FD Disclosure',
                        '8.01': 'Other Events',
                        '9.01': 'Financial Statements and Exhibits'
                    };
                    
                    itemsList.forEach(item => {
                        const trimmedItem = item.trim();
                        if (significantItems[trimmedItem]) {
                            filingsAnalysis.filingStats.significantEvents.push({
                                type: significantItems[trimmedItem],
                                documentName: doc,
                                item: trimmedItem,
                                description: description
                            });
                        }
                    });
                }
            } else if ((type === 'DEF 14A' || doc.includes('def14a')) && formCounts['DEF 14A'] < 5) {
                filingsAnalysis.recent['DEF 14A'].push(filing);
                formCounts['DEF 14A']++;
            }
        }
        
        // Calculate filing statistics
        filingsAnalysis.filingStats.totalFilings = recentFilings.form.filter(form => form).length;
        
        // Count filings in last quarter (90 days)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        
        filingsAnalysis.filingStats.lastQuarterFilings = recentFilings.filingDate
            .filter(date => new Date(date) > cutoffDate).length;

        console.log('Filing analysis complete:', {
            totalFilings: filingsAnalysis.filingStats.totalFilings,
            recentCounts: {
                '10-K': filingsAnalysis.recent['10-K'].length,
                '10-Q': filingsAnalysis.recent['10-Q'].length,
                '8-K': filingsAnalysis.recent['8-K'].length,
                'DEF 14A': filingsAnalysis.recent['DEF 14A'].length
            },
            significantEvents: filingsAnalysis.filingStats.significantEvents.length
        });

        return filingsAnalysis;
    }

    async extractRevenue(data) {
        try {
            const revenueData = data.facts['us-gaap'].Revenues;
            if (!revenueData) return null;

            const annualRevenue = revenueData.units.USD
                .filter(entry => entry.form === '10-K')
                .sort((a, b) => new Date(b.end) - new Date(a.end))[0];

            return annualRevenue ? annualRevenue.val : null;
        } catch (error) {
            console.error('Error extracting revenue:');
            return null;
        }
    }

    async extractMarketCap(data) {
        try {
            const sharesOutstanding = data.facts['dei'].EntityCommonStockSharesOutstanding;
            if (!sharesOutstanding) return null;

            const latestShares = sharesOutstanding.units.shares
                .sort((a, b) => new Date(b.end) - new Date(a.end))[0];

            if (!latestShares) return null;

            const stockData = await this.fetchYahooFinanceData(data.entityName);
            if (!stockData) return null;

            const marketCap = latestShares.val * stockData.price;
            
            return {
                marketCap,
                sharesOutstanding: latestShares.val,
                stockPrice: stockData.price,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error extracting market cap:');
            return null;
        }
    }

    async fetchYahooFinanceData(companyName) {
        try {
            const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${querystring.escape(companyName)}&quotesCount=1&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
            
            const { data: searchData } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!searchData.quotes || searchData.quotes.length === 0) {
                throw new Error('Company symbol not found');
            }

            const symbol = searchData.quotes[0].symbol;
            const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            
            const { data: quoteData } = await axios.get(quoteUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!quoteData.chart || !quoteData.chart.result || !quoteData.chart.result[0]) {
                throw new Error('Stock price data not found');
            }

            return {
                symbol,
                price: quoteData.chart.result[0].meta.regularMarketPrice,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching Yahoo Finance data:');
            return null;
        }
    }

    async extractRDExpense(data) {
        try {
            const rdData = data.facts['us-gaap'].ResearchAndDevelopmentExpense;
            if (!rdData) return null;

            const annualRD = rdData.units.USD
                .filter(entry => entry.form === '10-K')
                .sort((a, b) => new Date(b.end) - new Date(a.end))[0];

            return annualRD ? annualRD.val : null;
        } catch (error) {
            console.error('Error extracting R&D expense:');
            return null;
        }
    }

    async fetchLatestFilings(cik) {
        try {
            const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
            const { data } = await axios.get(url, {
                headers: this.headers
            });

            if (!data || !data.filings || !data.filings.recent) {
                throw new Error('Invalid filings data structure');
            }

            const filingTypes = ['10-K', '10-Q', '8-K', 'DEF 14A'];
            const filings = {};

            for (const type of filingTypes) {
                filings[type] = await this.processFilings(data.filings.recent, type);
            }

            return filings;
        } catch (error) {
            console.error('Error fetching filings:');
            return {
                '10-K': [],
                '10-Q': [],
                '8-K': [],
                'DEF 14A': []
            };
        }
    }

    processFilings(recentFilings, type) {
        try {
            if (!Array.isArray(recentFilings)) {
                console.error('Recent filings is not an array:');
                return [];
            }

            return recentFilings
                .filter(filing => filing.form === type)
                .slice(0, 5)
                .map(filing => ({
                    accessionNumber: filing.accessionNumber,
                    filingDate: filing.filingDate,
                    form: filing.form,
                    primaryDocument: filing.primaryDocument
                }));
        } catch (error) {
            console.error(`Error processing ${type} filings:`);
            return [];
        }
    }

    async makeRequest(url) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`SEC API error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('No response received from SEC API');
            } else {
                throw error;
            }
        }
    }
}

// Example usage:
async function analyzeCompetitor(apiKey, cik) {
    const secFetcher = new SECDataFetcher(apiKey);
    const data = await secFetcher.fetchCompanyData(cik);
    
    if (data.success) {
        // console.log('Company Metrics:', data.metrics);
        console.log('Latest Filings:', data);
    } else {
        console.error('Error:', data.error);
    }
}
app.get('/api/competitor/:cik', async (req, res) => {
    const apiKey = process.env.SEC_API_KEY;
    const { cik } = req.params;
    
    try {
        const secFetcher = new SECDataFetcher(apiKey);
        const data = await secFetcher.fetchCompanyData(cik);
        console.log(data)
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Replace "Google" with the company name you want to search for



app.listen(PORT, async () => {
    // analyzeCompetitor(process.env.SEC_USER_AGENT, '0000066740')
    console.log(`Server running on port ${PORT}`);
    // const axios = require('axios');
    // const testAllEndpointsx = await testAllEndpoints()
    // console.log(testAllEndpointsx);

})
// Create a .env file with the following variables:
/*
NEWS_API_KEY=your_newsapi_key
FDA_API_KEY=your_fda_key
CRUNCHBASE_API_KEY=your_crunchbase_key
NODE_ENV=development
PORT=3000
*/