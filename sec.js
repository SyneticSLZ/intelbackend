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

// Industry examples and their related keywords
// Financial data tracking helpers
// Advanced Financial Metrics
async function getDetailedFinancials(companyName) {
    const baseFinancials = await getCompanyFinancials(companyName);
    
    // Enhanced financial metrics
    const detailedMetrics = {
        ...baseFinancials,
        metrics: {
            runwayMonths: null,
            cashFlow: {
                monthly: null,
                quarterly: null,
                annual: null
            },
            unitEconomics: {
                cac: null,            // Customer Acquisition Cost
                ltv: null,            // Lifetime Value
                grossMargin: null,
                paybackPeriod: null
            },
            efficiency: {
                revenuePerEmployee: null,
                burnMultiple: null,    // Net burn / net new ARR
                magicNumber: null      // Net new ARR / S&M spend
            },
            growth: {
                mrr: null,            // Monthly Recurring Revenue
                yoyGrowth: null,
                quarterlyGrowth: null,
                revenueRetention: null
            }
        },
        ratios: {
            currentRatio: null,
            quickRatio: null,
            debtToEquity: null,
            operatingMargin: null
        }
    };

    // Calculate additional metrics if data is available
    if (baseFinancials.estimatedRevenue) {
        detailedMetrics.metrics.efficiency.revenuePerEmployee = 
            baseFinancials.estimatedRevenue / (company.employeeCount || 50);
    }

    return detailedMetrics;
}

// Enhanced Competitor Analysis
async function getDetailedCompetitorAnalysis(company, industry) {
    const baseAnalysis = await getCompetitorAnalysis(company, industry);
    
    const enhancedAnalysis = {
        ...baseAnalysis,
        competitiveMatrix: {
            features: {},           // Feature comparison matrix
            pricing: {},           // Pricing strategy comparison
            marketFit: {},         // Product-market fit analysis
            techStack: {},         // Technology stack comparison
            userMetrics: {}        // User engagement metrics
        },
        swot: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
        },
        moats: {
            network: null,         // Network effects strength
            switching: null,       // Switching costs
            brand: null,          // Brand value
            patents: null,        // IP protection
            regulatory: null      // Regulatory advantages
        }
    };

    // Compare features across competitors
    for (const competitor of baseAnalysis.directCompetitors) {
        enhancedAnalysis.competitiveMatrix.features[competitor.name] = 
            await analyzeCompetitorFeatures(competitor);
    }

    return enhancedAnalysis;
}

// Growth Prediction Modeling
async function predictGrowth(company, timeframe = 12) {
    const predictions = {
        revenue: {
            optimistic: [],
            realistic: [],
            conservative: []
        },
        market: {
            shareProjection: [],
            penetration: [],
            saturation: null
        },
        risks: {
            market: null,
            execution: null,
            competition: null,
            regulatory: null
        },
        milestones: []
    };

    // Get historical data
    const historicalData = await getHistoricalData(company);
    
    // Calculate growth trajectories using different models
    predictions.revenue = calculateGrowthTrajectories(historicalData, timeframe);
    
    // Predict market evolution
    predictions.market = predictMarketEvolution(company.industry, timeframe);
    
    // Risk assessment
    predictions.risks = assessRisks(company, historicalData);

    return predictions;
}

// Free Data Sources Integration
const DATA_SOURCES = {
    NEWS: {
        HACKERNEWS: 'https://hacker-news.firebaseio.com/v0',
        GITHUB_TRENDS: 'https://api.github.com/search/repositories',
        REDDIT: 'https://www.reddit.com/r/startups/.json'
    },
    MARKETS: {
        ALPHAVANTAGE: 'https://www.alphavantage.co/query',  // Free tier available
        YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance',
        FRED: 'https://api.stlouisfed.org/fred'  // Free economic data
    },
    PATENTS: {
        GOOGLE_PATENTS: 'https://patents.google.com/api',
        USPTO: 'https://developer.uspto.gov/api-catalog'
    }
};

// Advanced ML Models
const ML_MODELS = {
    GROWTH: {
        type: 'lstm',
        layers: [64, 32, 16],
        timeSteps: 12
    },
    MARKET: {
        type: 'transformer',
        layers: [128, 64],
        attention: true
    },
    ANOMALY: {
        type: 'autoencoder',
        layers: [32, 16, 8, 16, 32],
        threshold: 0.95
    }
};

// Additional Free Data Sources
const EXTENDED_DATA_SOURCES = {
    ...DATA_SOURCES,
    ACADEMIC: {
        ARXIV: 'https://export.arxiv.org/api',
        SEMANTIC_SCHOLAR: 'https://api.semanticscholar.org/v1'
    },
    GOVERNMENT: {
        CENSUS: 'https://api.census.gov/data',
        EU_STARTUP_DATA: 'https://data.europa.eu/api/hub/search'
    },
    TECH: {
        STACKSHARE: 'https://api.stackshare.io/graphql',
        LIBRARIES_IO: 'https://libraries.io/api'
    },
    FUNDING: {
        OPEN_COLLECTIVE: 'https://api.opencollective.com/graphql',
        GRANTS_GOV: 'https://www.grants.gov/grantsws'
    }
};

// Enhanced ML Models
async function createAdvancedModels() {
    const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');
    
    // LSTM for time series prediction
    function createLSTMModel(inputShape) {
        const model = tf.sequential();
        model.add(tf.layers.lstm({
            units: ML_MODELS.GROWTH.layers[0],
            inputShape: inputShape,
            returnSequences: true
        }));
        model.add(tf.layers.dropout(0.2));
        model.add(tf.layers.lstm({
            units: ML_MODELS.GROWTH.layers[1],
            returnSequences: false
        }));
        model.add(tf.layers.dense({ units: 1 }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });
        
        return model;
    }
    
    // Transformer for market analysis
    function createTransformerModel(inputShape) {
        const model = tf.sequential();
        model.add(tf.layers.dense({
            units: ML_MODELS.MARKET.layers[0],
            inputShape: inputShape,
            activation: 'relu'
        }));
        // Simplified transformer-like attention
        if (ML_MODELS.MARKET.attention) {
            model.add(createSelfAttention(ML_MODELS.MARKET.layers[0]));
        }
        model.add(tf.layers.dense({ units: ML_MODELS.MARKET.layers[1] }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy'
        });
        
        return model;
    }
    
    // Autoencoder for anomaly detection
    function createAnomalyDetector(inputShape) {
        const encoder = tf.sequential();
        const decoder = tf.sequential();
        
        // Encoder
        ML_MODELS.ANOMALY.layers.slice(0, Math.floor(ML_MODELS.ANOMALY.layers.length / 2))
            .forEach((units, i) => {
                encoder.add(tf.layers.dense({
                    units,
                    activation: 'relu',
                    inputShape: i === 0 ? inputShape : undefined
                }));
            });
            
        // Decoder
        ML_MODELS.ANOMALY.layers.slice(Math.floor(ML_MODELS.ANOMALY.layers.length / 2))
            .forEach(units => {
                decoder.add(tf.layers.dense({
                    units,
                    activation: 'relu'
                }));
            });
            
        return { encoder, decoder };
    }
    
    return {
        createLSTMModel,
        createTransformerModel,
        createAnomalyDetector
    };
}

// Advanced Anomaly Detection
async function detectAnomalies(data, modelConfig = ML_MODELS.ANOMALY) {
    const anomalies = {
        timeSeriesAnomalies: [],
        patternAnomalies: [],
        statisticalAnomalies: [],
        confidence: {}
    };
    
    try {
        const { encoder, decoder } = await createAdvancedModels()
            .then(models => models.createAnomalyDetector([data[0].numerical_features.length]));
            
        // Reconstruction error-based anomaly detection
        const input = tf.tensor(data.map(d => d.numerical_features));
        const encoded = encoder.predict(input);
        const reconstructed = decoder.predict(encoded);
        const errors = tf.sub(input, reconstructed).abs().mean(1);
        
        // Find anomalies based on reconstruction error
        const threshold = tf.scalar(modelConfig.threshold);
        const anomalyMask = errors.greater(threshold);
        anomalies.timeSeriesAnomalies = await anomalyMask.data();
        
        // Statistical anomaly detection
        anomalies.statisticalAnomalies = detectStatisticalAnomalies(data);
        
        // Pattern anomaly detection using rolling statistics
        anomalies.patternAnomalies = detectPatternAnomalies(data);
        
        // Calculate confidence scores
        anomalies.confidence = calculateAnomalyConfidence(
            anomalies.timeSeriesAnomalies,
            anomalies.statisticalAnomalies,
            anomalies.patternAnomalies
        );
        
    } catch (error) {
        console.error('Anomaly detection error:', error);
    }
    
    return anomalies;
}

// Enhanced Sentiment Analysis with NLP
class EnhancedSentimentAnalyzer {
    constructor() {
        this.tokenizer = this.createTokenizer();
        this.loadLexicon();
    }
    
    createTokenizer() {
        // Simple word tokenizer with handling for common business terms
        return (text) => text.toLowerCase()
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // Split camelCase
            .match(/\b[\w']+\b/g) || [];
    }
    
    loadLexicon() {
        // Enhanced sentiment lexicon with business/startup specific terms
        this.lexicon = {
            positive: [
                'growth', 'innovation', 'launch', 'partnership', 'success',
                'profitable', 'expansion', 'funding', 'patent', 'breakthrough',
                'scalable', 'innovative', 'disruption', 'leading', 'revolutionary'
            ],
            negative: [
                'lawsuit', 'delay', 'problem', 'issue', 'complaint',
                'bankruptcy', 'layoff', 'debt', 'failure', 'violation',
                'risk', 'investigation', 'decline', 'loss', 'competitor'
            ],
            neutral: [
                'update', 'change', 'announcement', 'report', 'research',
                'development', 'release', 'plan', 'strategy', 'market'
            ],
            modifiers: {
                intensifiers: ['very', 'highly', 'extremely', 'significantly'],
                diminishers: ['slightly', 'somewhat', 'relatively', 'partially']
            }
        };
    }
    
    analyzeSentiment(text) {
        const tokens = this.tokenizer(text);
        let score = 0;
        let sentiment = {};
        
        // Calculate base sentiment
        tokens.forEach((token, i) => {
            let multiplier = 1;
            
            // Check for modifiers
            if (i > 0) {
                if (this.lexicon.modifiers.intensifiers.includes(tokens[i-1])) {
                    multiplier = 2;
                } else if (this.lexicon.modifiers.diminishers.includes(tokens[i-1])) {
                    multiplier = 0.5;
                }
            }
            
            if (this.lexicon.positive.includes(token)) score += (1 * multiplier);
            if (this.lexicon.negative.includes(token)) score -= (1 * multiplier);
        });
        
        // Analyze aspects
        sentiment = {
            score,
            label: this.getSentimentLabel(score),
            confidence: this.calculateConfidence(tokens),
            aspects: this.analyzeAspects(tokens),
            summary: this.generateSentimentSummary(score, tokens)
        };
        
        return sentiment;
    }
    
    getSentimentLabel(score) {
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }
    
    calculateConfidence(tokens) {
        // Calculate confidence based on recognized terms ratio
        const recognizedTerms = tokens.filter(token => 
            this.lexicon.positive.includes(token) ||
            this.lexicon.negative.includes(token) ||
            this.lexicon.neutral.includes(token)
        ).length;
        
        return recognizedTerms / tokens.length;
    }
    
    analyzeAspects(tokens) {
        // Group sentiment by business aspects
        const aspects = {
            product: 0,
            market: 0,
            financial: 0,
            growth: 0
        };
        
        // Implement aspect-based sentiment analysis
        
        return aspects;
    }
    
    generateSentimentSummary(score, tokens) {
        // Generate natural language summary of sentiment analysis
        return {
            mainSentiment: this.getSentimentLabel(score),
            intensity: Math.abs(score) > 2 ? 'strong' : 'moderate',
            keyTerms: this.extractKeyTerms(tokens)
        };
    }
    
    extractKeyTerms(tokens) {
        // Extract most significant terms for sentiment
        return tokens.filter(token =>
            this.lexicon.positive.includes(token) ||
            this.lexicon.negative.includes(token)
        ).slice(0, 5);
    }
}
// }

// Simple ML models using browser-based TensorFlow.js
async function trainGrowthModel(historicalData) {
    // Import TensorFlow.js
    const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');
    
    const preprocessed = preprocessData(historicalData);
    
    // Create a simple sequential model
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ units: 10, activation: 'relu', inputShape: [5] }),
            tf.layers.dense({ units: 5, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'linear' })
        ]
    });
    
    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError'
    });
    
    return model;
}

// Enhanced data collection with free APIs
async function collectEnhancedData(company, options = {}) {
    const enhancedData = {
        news: [],
        patents: [],
        marketIndicators: [],
        socialSignals: [],
        techTrends: []
    };
    
    // Collect HackerNews mentions
    try {
        const hnResponse = await fetch(`${DATA_SOURCES.NEWS.HACKERNEWS}/search?query=${encodeURIComponent(company.name)}`);
        enhancedData.news.push(...await hnResponse.json());
    } catch (error) {
        console.error('HackerNews API error:', error);
    }
    
    // Get GitHub technology trends
    try {
        const githubResponse = await fetch(
            `${DATA_SOURCES.NEWS.GITHUB_TRENDS}?q=org:${company.name}&sort=updated`,
            { headers: { 'Accept': 'application/vnd.github.v3+json' } }
        );
        const githubData = await githubResponse.json();
        enhancedData.techTrends = analyzeGitHubTrends(githubData);
    } catch (error) {
        console.error('GitHub API error:', error);
    }
    
    // Get market indicators from Alpha Vantage (free tier)
    if (options.includeMarket) {
        try {
            const marketResponse = await fetch(
                `${DATA_SOURCES.MARKETS.ALPHAVANTAGE}/query?function=OVERVIEW&symbol=${company.stockSymbol}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`
            );
            enhancedData.marketIndicators = await marketResponse.json();
        } catch (error) {
            console.error('Alpha Vantage API error:', error);
        }
    }
    
    // Get patent data
    try {
        const patentResponse = await fetch(
            `${DATA_SOURCES.PATENTS.GOOGLE_PATENTS}/query?inventor=${encodeURIComponent(company.name)}&publication_date>2020`
        );
        enhancedData.patents = await patentResponse.json();
    } catch (error) {
        console.error('Patent API error:', error);
    }
    
    return enhancedData;
}

// ML-based growth prediction
async function predictGrowthML(company, historicalData, timeframe = 12) {
    const predictions = {
        revenue: [],
        confidence: [],
        factors: {}
    };
    
    try {
        // Train model on historical data
        const model = await trainGrowthModel(historicalData);
        
        // Get enhanced data for better predictions
        const enhancedData = await collectEnhancedData(company);
        
        // Prepare features for prediction
        const features = prepareFeatures(company, enhancedData);
        
        // Make predictions for each month
        for (let i = 1; i <= timeframe; i++) {
            const prediction = await model.predict(features).data();
            predictions.revenue.push({
                month: i,
                value: prediction[0],
                confidence: calculateConfidence(prediction, enhancedData)
            });
        }
        
        // Analyze important factors
        predictions.factors = analyzeGrowthFactors(model, features);
        
    } catch (error) {
        console.error('ML prediction error:', error);
        // Fallback to simpler statistical prediction
        return predictGrowth(company, timeframe);
    }
    
    return predictions;
}

// Sentiment Analysis using simple NLP
function analyzeSentiment(text) {
    // Simple sentiment dictionary
    const sentimentDictionary = {
        positive: ['growth', 'innovation', 'success', 'launch', 'partnership'],
        negative: ['lawsuit', 'delay', 'problem', 'issue', 'complaint']
    };

    const words = text.toLowerCase().split(/\W+/);
    let score = 0;

    words.forEach(word => {
        if (sentimentDictionary.positive.includes(word)) score += 1;
        if (sentimentDictionary.negative.includes(word)) score -= 1;
    });

    return {
        score,
        sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
    };
}

// Enhanced market analysis with ML
async function analyzeMarketML(industry) {
    const marketData = await analyzeMarketTrends(industry);
    const enhancedAnalysis = {
        ...marketData,
        predictions: {},
        signals: {},
        correlations: {}
    };
    
    try {
        // Collect data from multiple sources
        const sources = await Promise.all([
            collectEnhancedData({ name: industry }, { includeMarket: true }),
            fetch(`${DATA_SOURCES.MARKETS.FRED}/series?series_id=GDP&api_key=${process.env.FRED_API_KEY}`),
            fetch(`${DATA_SOURCES.NEWS.REDDIT}/r/startups/search.json?q=${industry}&restrict_sr=on`)
        ]);
        
        // Analyze market signals
        enhancedAnalysis.signals = analyzeMarketSignals(sources);
        
        // Find correlations between different factors
        enhancedAnalysis.correlations = findCorrelations(sources);
        
        // Make ML-based predictions
        const model = await trainGrowthModel(sources[0]);
        enhancedAnalysis.predictions = await model.predict(prepareFeatures({ industry }, sources)).data();
        
    } catch (error) {
        console.error('Market ML analysis error:', error);
    }
    
    return enhancedAnalysis;
}

    // Analyze market data
    const marketData = await getMarketData(industry);
    trends.overall = calculateMarketMetrics(marketData);
    
    // Segment analysis
    trends.segments = analyzeSegments(marketData);
    
    // Technology tracking
    trends.technology = trackTechnologyTrends(industry);

    return trends;
}
    
    try {
        // Check Crunchbase-like APIs
        const cbResponse = await makeRequest(
            `https://api.crunchbase.com/api/v4/entities/organizations/${encodeURIComponent(companyName)}`
        );
        if (cbResponse?.data) {
            financials.fundingRounds = cbResponse.data.funding_rounds;
            financials.lastValuation = cbResponse.data.valuation;
            financials.investors = cbResponse.data.investors;
        }
        
        // Check SEC EDGAR filings for public data
        const edgarResponse = await makeRequest(
            `https://data.sec.gov/api/xbrl/companyfacts/${encodeURIComponent(companyName)}`
        );
        if (edgarResponse?.facts) {
            financials.secFilings = edgarResponse.facts;
        }
        
        // Estimate revenue based on available signals
        // (employees, job postings, office locations, etc.)
        financials.estimatedRevenue = estimateRevenue(companyName);
        
    } catch (error) {
        console.error('Error fetching financial data:', error);
    }
    
    return financials;
}

function estimateRevenue(companyName, employeeCount, jobPostings, locations) {
    // Basic revenue estimation based on available signals
    let estimatedRevenue = null;
    
    // Revenue ranges based on employee count
    const revenueRanges = {
        startup: { min: 0, max: 1000000 },
        small: { min: 1000000, max: 10000000 },
        medium: { min: 10000000, max: 50000000 },
        large: { min: 50000000, max: 250000000 }
    };
    
    // Implement estimation logic based on available data
    return estimatedRevenue;
}

async function getCompetitorAnalysis(company, industry) {
    const analysis = {
        directCompetitors: [],
        indirectCompetitors: [],
        marketSize: null,
        marketShare: null,
        competitiveAdvantages: [],
        weaknesses: []
    };
    
    // Get industry competitors
    const competitors = INDUSTRY_EXAMPLES[industry]?.competitions || [];
    
    // Analyze each competitor
    for (const competitor of competitors) {
        const competitorData = await discoverCompanies(competitor, { maxResults: 1 });
        if (competitorData.length > 0) {
            analysis.directCompetitors.push({
                name: competitor,
                data: competitorData[0],
                financials: await getCompanyFinancials(competitor)
            });
        }
    }
    
    // Calculate market metrics
    analysis.marketSize = INDUSTRY_EXAMPLES[industry]?.marketSize;
    
    return analysis;
}

const INDUSTRY_EXAMPLES = {
    AI_ML: {
        name: 'AI & Machine Learning',
        keywords: ['artificial intelligence', 'machine learning', 'deep learning', 'nlp', 'computer vision', 'generative ai'],
        typicalFunding: '$1M-$50M',
        growthRate: 'Very High',
        competitions: ['OpenAI', 'Anthropic', 'Cohere', 'AI21 Labs']
    },
    CLIMATE_TECH: {
        name: 'Climate Tech',
        keywords: ['renewable energy', 'carbon capture', 'clean energy', 'sustainability', 'climate solutions'],
        typicalFunding: '$5M-$100M',
        growthRate: 'High',
        competitions: ['Tesla Energy', 'Climeworks', 'Form Energy']
    },
    BIOTECH: {
        name: 'Biotech & Life Sciences',
        keywords: ['biotechnology', 'genomics', 'crispr', 'synthetic biology', 'drug discovery'],
        typicalFunding: '$10M-$200M',
        growthRate: 'High',
        competitions: ['Moderna', 'Ginkgo Bioworks', '23andMe']
    },
    FINTECH: {
        name: 'Financial Technology',
        keywords: ['fintech', 'defi', 'digital banking', 'payments', 'insurtech', 'regtech'],
        typicalFunding: '$1M-$50M',
        growthRate: 'High',
        competitions: ['Stripe', 'Plaid', 'Klarna']
    },
    SPACE_TECH: {
        name: 'Space Technology',
        keywords: ['space tech', 'satellite', 'aerospace', 'rocket', 'space exploration'],
        typicalFunding: '$10M-$500M',
        growthRate: 'Medium',
        marketSize: '$350B',
        competitions: ['SpaceX', 'Rocket Lab', 'Planet Labs']
    },
    WEB3: {
        name: 'Web3 & Blockchain',
        keywords: ['blockchain', 'crypto', 'web3', 'nft', 'defi', 'dao'],
        typicalFunding: '$1M-$50M',
        growthRate: 'High',
        marketSize: '$80B',
        competitions: ['Coinbase', 'OpenSea', 'Alchemy']
    },
    HEALTHTECH: {
        name: 'Digital Health',
        keywords: ['healthtech', 'telemedicine', 'digital health', 'medical devices', 'healthcare AI'],
        typicalFunding: '$5M-$100M',
        growthRate: 'High',
        marketSize: '$250B',
        competitions: ['Teladoc', 'Oscar Health', 'Babylon Health']
    },
    EDTECH: {
        name: 'Education Technology',
        keywords: ['edtech', 'online learning', 'educational software', 'learning management'],
        typicalFunding: '$1M-$30M',
        growthRate: 'Medium',
        marketSize: '$150B',
        competitions: ['Coursera', 'Duolingo', 'Udemy']
    },
    ROBOTICS: {
        name: 'Robotics & Automation',
        keywords: ['robotics', 'automation', 'industrial robots', 'collaborative robots'],
        typicalFunding: '$5M-$100M',
        growthRate: 'High',
        marketSize: '$120B',
        competitions: ['Boston Dynamics', 'UIPath', 'Berkshire Grey']
    },
    CYBERSECURITY: {
        name: 'Cybersecurity',
        keywords: ['cybersecurity', 'security software', 'threat detection', 'zero trust'],
        typicalFunding: '$5M-$80M',
        growthRate: 'Very High',
        marketSize: '$200B',
        competitions: ['CrowdStrike', 'SentinelOne', 'Snyk']
    },
    GAMING: {
        name: 'Gaming & Esports',
        keywords: ['gaming', 'esports', 'game development', 'game engine'],
        typicalFunding: '$1M-$50M',
        growthRate: 'High',
        marketSize: '$180B',
        competitions: ['Unity', 'Epic Games', 'Roblox']
    },
    AGTECH: {
        name: 'Agricultural Technology',
        keywords: ['agtech', 'agriculture', 'farming technology', 'precision agriculture'],
        typicalFunding: '$2M-$40M',
        growthRate: 'Medium',
        marketSize: '$70B',
        competitions: ['Indigo Ag', 'Plenty', 'Farmers Business Network']
    }
};

// Function to discover companies based on industry/keyword
async function discoverCompanies(keyword, options = {}) {
    const {
        maxResults = 10,
        minEmployees = 0,
        maxEmployees = 1000,
        foundedAfter = '2023-01-01',
        industry = null
    } = options;

    // If industry is provided, add related keywords to search
    let searchTerms = [keyword];
    if (industry && INDUSTRY_EXAMPLES[industry]) {
        searchTerms = [...searchTerms, ...INDUSTRY_EXAMPLES[industry].keywords];
    }

    const companies = new Set();

    // Check CrunchBase alternative (OpenCorporates)
    const openCorpResults = await makeRequest(
        `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(keyword)}`
    );
    if (openCorpResults?.results) {
        openCorpResults.results.forEach(company =>         companies.add({
            name: company.name,
            source: 'OpenCorporates',
            foundedDate: company.incorporation_date,
            url: company.opencorporates_url,
            registeredAddress: company.registered_address,
            jurisdiction: company.jurisdiction_code,
            companyType: company.company_type,
            status: company.current_status,
            directors: company.officers,
            filings: company.filings
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
                // Get repository data
                const repos = await makeRequest(`${org.url}/repos`);
                const technologies = new Set();
                repos?.forEach(repo => {
                    if (repo.language) technologies.add(repo.language);
                });

                companies.add({
                    name: details.name || org.login,
                    source: 'GitHub',
                    foundedDate: details.created_at?.split('T')[0],
                    url: details.html_url,
                    description: details.description,
                    location: details.location,
                    blog: details.blog,
                    publicRepos: details.public_repos,
                    followers: details.followers,
                    technologies: Array.from(technologies),
                    mainLanguages: Array.from(technologies).slice(0, 3),
                    recentActivity: repos?.slice(0, 5).map(repo => ({
                        name: repo.name,
                        stars: repo.stargazers_count,
                        forks: repo.forks_count,
                        lastUpdated: repo.updated_at
                    }))
                });
            }
        }
    }

    // Check AngelList and additional job boards
    const jobSources = [
        { url: 'https://angel.co/company-sitemap.xml', name: 'AngelList' },
        { url: 'https://www.ycombinator.com/jobs', name: 'Y Combinator' },
        { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', name: 'WeWorkRemotely' }
    ];

    for (const source of jobSources) {
        const response = await fetch(source.url);
        const text = await response.text();
        const items = text.match(/<url>[\s\S]*?<\/url>/g) || [];
    
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

// Example usage
async function example() {
    // Discover companies in AI industry
    const aiCompanies = await discoverCompanies('artificial intelligence', {
        maxResults: 5,
        foundedAfter: '2023-01-01'
    });
    console.log('Discovered companies:', aiCompanies);

    // Start tracking the first company
    if (aiCompanies.length > 0) {
        const tracked = startTracking(aiCompanies[0]);
        console.log('Started tracking:', tracked);

        // Update data for the company
        const updates = await updateCompanyData(tracked.name);
        console.log('Updates:', updates);

        // Get tracking history
        const history = getCompanyHistory(tracked.name);
        console.log('Tracking history:', history);
    }
}

// Export functions for use
export {
    discoverCompanies,
    startTracking,
    updateCompanyData,
    getCompanyHistory
};