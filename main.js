// ====================
// MAIN.JS - Lead Scraper Actor
// ====================

import { Actor } from 'apify';
import { PuppeteerCrawler, Dataset } from 'crawlee';

// Initialize the Actor
await Actor.init();

// Get input from Apify platform
const input = await Actor.getInput() || {};
const {
    startUrls = [],
    maxResults = 50,
    targetIndustry = null,
    proxyConfiguration = { useApifyProxy: true }
} = input;

console.log('Starting Lead Scraper with input:', input);

// Lead data schema
const createLeadObject = () => ({
    companyName: null,
    websiteUrl: null,
    industry: null,
    location: null,
    companySize: null,
    companyType: null,
    decisionMakerName: null,
    decisionMakerRole: null,
    email: null,
    phone: null,
    linkedIn: null,
    facebook: null,
    twitter: null,
    instagram: null,
    websiteQualityScore: null,
    websiteQualityRating: null,
    brandingNeeds: null,
    leadScore: 0,
    scrapedAt: new Date().toISOString(),
    errors: []
});

// ====================
// EXTRACTION FUNCTIONS
// ====================

async function extractCompanyName(page) {
    try {
        return await page.evaluate(() => {
            // Try meta tags first
            const ogTitle = document.querySelector('meta[property="og:site_name"]');
            if (ogTitle) return ogTitle.content;

            // Try title tag
            const title = document.title;
            if (title) {
                // Clean up common suffixes
                return title.split('|')[0].split('-')[0].trim();
            }

            // Try logo alt text
            const logo = document.querySelector('img[alt*="logo" i]');
            if (logo) return logo.alt.replace(/logo/i, '').trim();

            // Try h1
            const h1 = document.querySelector('h1');
            if (h1) return h1.textContent.trim();

            return null;
        });
    } catch (error) {
        console.error('Error extracting company name:', error.message);
        return null;
    }
}

async function extractEmail(page) {
    try {
        return await page.evaluate(() => {
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const bodyText = document.body.innerText;
            const emails = bodyText.match(emailRegex) || [];

            // Filter out unwanted emails
            const goodEmail = emails.find(email => {
                const lower = email.toLowerCase();
                return !lower.includes('example.com') &&
                       !lower.includes('yourdomain') &&
                       !lower.includes('placeholder') &&
                       !lower.startsWith('noreply') &&
                       !lower.startsWith('no-reply') &&
                       !lower.includes('privacy@') &&
                       !lower.includes('abuse@');
            });

            return goodEmail || null;
        });
    } catch (error) {
        console.error('Error extracting email:', error.message);
        return null;
    }
}

async function extractPhone(page) {
    try {
        return await page.evaluate(() => {
            // Multiple phone patterns
            const patterns = [
                /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
                /\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}/g
            ];

            const bodyText = document.body.innerText;
            
            for (const pattern of patterns) {
                const phones = bodyText.match(pattern);
                if (phones && phones.length > 0) {
                    // Return first valid phone
                    return phones[0].trim();
                }
            }

            return null;
        });
    } catch (error) {
        console.error('Error extracting phone:', error.message);
        return null;
    }
}

async function extractSocialLinks(page) {
    try {
        return await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const social = {
                linkedIn: null,
                facebook: null,
                twitter: null,
                instagram: null
            };

            links.forEach(link => {
                const href = link.href.toLowerCase();
                if (href.includes('linkedin.com') && !social.linkedIn) {
                    social.linkedIn = link.href;
                } else if (href.includes('facebook.com') && !social.facebook) {
                    social.facebook = link.href;
                } else if ((href.includes('twitter.com') || href.includes('x.com')) && !social.twitter) {
                    social.twitter = link.href;
                } else if (href.includes('instagram.com') && !social.instagram) {
                    social.instagram = link.href;
                }
            });

            return social;
        });
    } catch (error) {
        console.error('Error extracting social links:', error.message);
        return { linkedIn: null, facebook: null, twitter: null, instagram: null };
    }
}

async function extractLocation(page) {
    try {
        return await page.evaluate(() => {
            // Look for address patterns
            const bodyText = document.body.innerText;
            
            // Common location indicators
            const locationKeywords = ['address:', 'location:', 'located in', 'based in'];
            
            for (const keyword of locationKeywords) {
                const index = bodyText.toLowerCase().indexOf(keyword);
                if (index !== -1) {
                    // Get next 100 characters after keyword
                    const snippet = bodyText.substring(index, index + 100);
                    // Look for city, state/country pattern
                    const locationMatch = snippet.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/);
                    if (locationMatch) return locationMatch[1];
                }
            }

            // Try footer
            const footer = document.querySelector('footer');
            if (footer) {
                const footerText = footer.innerText;
                const match = footerText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2,})/);
                if (match) return match[1];
            }

            return null;
        });
    } catch (error) {
        console.error('Error extracting location:', error.message);
        return null;
    }
}

async function detectIndustry(page) {
    try {
        return await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            const metaDescription = document.querySelector('meta[name="description"]');
            const fullText = text + (metaDescription ? metaDescription.content.toLowerCase() : '');

            const industries = {
                'Technology': ['software', 'saas', 'tech', 'digital', 'app', 'platform', 'cloud'],
                'Healthcare': ['health', 'medical', 'hospital', 'clinic', 'dental', 'pharmacy'],
                'Finance': ['finance', 'bank', 'accounting', 'insurance', 'investment'],
                'Real Estate': ['real estate', 'property', 'realtor', 'mortgage', 'housing'],
                'Retail': ['retail', 'shop', 'store', 'ecommerce', 'boutique'],
                'Restaurant': ['restaurant', 'cafe', 'food', 'dining', 'catering'],
                'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm'],
                'Education': ['education', 'school', 'training', 'learning', 'university'],
                'Construction': ['construction', 'builder', 'contractor', 'renovation'],
                'Marketing': ['marketing', 'advertising', 'agency', 'branding', 'seo']
            };

            for (const [industry, keywords] of Object.entries(industries)) {
                if (keywords.some(keyword => fullText.includes(keyword))) {
                    return industry;
                }
            }

            return 'Other';
        });
    } catch (error) {
        console.error('Error detecting industry:', error.message);
        return 'Unknown';
    }
}

async function assessWebsiteQuality(page) {
    try {
        const metrics = await page.evaluate(() => {
            const performance = window.performance;
            const timing = performance.timing;
            
            return {
                hasSSL: window.location.protocol === 'https:',
                hasMobileMeta: !!document.querySelector('meta[name="viewport"]'),
                hasLogo: !!document.querySelector('img[alt*="logo" i], img[class*="logo" i]'),
                hasContactPage: !!document.querySelector('a[href*="contact" i]'),
                imageCount: document.querySelectorAll('img').length,
                hasModernDesign: !!document.querySelector('[class*="flex"], [class*="grid"]'),
                hasSocialLinks: document.querySelectorAll('a[href*="facebook.com"], a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="instagram.com"]').length > 0,
                loadTime: timing.loadEventEnd - timing.navigationStart
            };
        });

        let score = 0;
        
        if (metrics.hasSSL) score += 20;
        if (metrics.hasMobileMeta) score += 20;
        if (metrics.hasLogo) score += 15;
        if (metrics.hasContactPage) score += 10;
        if (metrics.imageCount >= 5) score += 10;
        if (metrics.hasModernDesign) score += 15;
        if (metrics.hasSocialLinks) score += 10;

        let rating = 'Poor';
        let needsBranding = true;

        if (score >= 70) {
            rating = 'Good';
            needsBranding = false;
        } else if (score >= 40) {
            rating = 'Average';
            needsBranding = true;
        }

        return {
            score,
            rating,
            needsBranding
        };
    } catch (error) {
        console.error('Error assessing website quality:', error.message);
        return { score: 0, rating: 'Unknown', needsBranding: true };
    }
}

async function findDecisionMakers(page) {
    try {
        // First, look for team/about page links
        const teamPageUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const teamLink = links.find(a => 
                /team|about|leadership|management|staff|our-team/i.test(a.textContent) ||
                /team|about|leadership|management|staff/i.test(a.href)
            );
            return teamLink ? teamLink.href : null;
        });

        if (teamPageUrl) {
            await page.goto(teamPageUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        }

        return await page.evaluate(() => {
            const titles = ['CEO', 'Founder', 'Co-Founder', 'President', 'Director', 'Owner', 'Managing Director', 'Partner'];
            const text = document.body.innerText;

            for (const title of titles) {
                // Pattern: Name followed by title
                const regex = new RegExp(`([A-Z][a-z]+\\s+[A-Z][a-z]+)(?:.*?)${title}`, 'i');
                const match = text.match(regex);
                
                if (match) {
                    return {
                        name: match[1].trim(),
                        role: title
                    };
                }

                // Reverse pattern: Title followed by name
                const reverseRegex = new RegExp(`${title}(?:.*?)([A-Z][a-z]+\\s+[A-Z][a-z]+)`, 'i');
                const reverseMatch = text.match(reverseRegex);
                
                if (reverseMatch) {
                    return {
                        name: reverseMatch[1].trim(),
                        role: title
                    };
                }
            }

            return null;
        });
    } catch (error) {
        console.error('Error finding decision makers:', error.message);
        return null;
    }
}

function calculateLeadScore(data) {
    let score = 0;

    // Contact information (40 points)
    if (data.email) score += 20;
    if (data.phone) score += 15;
    if (data.decisionMakerName) score += 5;

    // Website quality indicates need (30 points)
    if (data.websiteQualityScore !== null) {
        if (data.websiteQualityScore < 40) {
            score += 30; // High need for improvement
        } else if (data.websiteQualityScore < 70) {
            score += 20; // Medium need
        } else {
            score += 10; // Low need but still potential
        }
    }

    // Social media presence (15 points)
    if (data.linkedIn) score += 5;
    if (data.facebook) score += 5;
    if (data.twitter || data.instagram) score += 5;

    // Complete profile (15 points)
    if (data.industry && data.industry !== 'Unknown') score += 5;
    if (data.location) score += 5;
    if (data.companyName) score += 5;

    return Math.min(score, 100);
}

// ====================
// MAIN CRAWLER
// ====================

const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);

const crawler = new PuppeteerCrawler({
    proxyConfiguration: proxyConfig,
    
    async requestHandler({ request, page }) {
        console.log(`Scraping: ${request.url}`);
        
        const leadData = createLeadObject();
        leadData.websiteUrl = request.url;

        try {
            // Set timeout for page load
            await page.goto(request.url, { 
                waitUntil: 'networkidle2', 
                timeout: 30000 
            });

            // Extract all data
            leadData.companyName = await extractCompanyName(page);
            leadData.email = await extractEmail(page);
            leadData.phone = await extractPhone(page);
            
            const socialLinks = await extractSocialLinks(page);
            leadData.linkedIn = socialLinks.linkedIn;
            leadData.facebook = socialLinks.facebook;
            leadData.twitter = socialLinks.twitter;
            leadData.instagram = socialLinks.instagram;

            leadData.location = await extractLocation(page);
            leadData.industry = await detectIndustry(page);

            const websiteQuality = await assessWebsiteQuality(page);
            leadData.websiteQualityScore = websiteQuality.score;
            leadData.websiteQualityRating = websiteQuality.rating;
            leadData.brandingNeeds = websiteQuality.needsBranding;

            // Try to find decision makers
            const decisionMaker = await findDecisionMakers(page);
            if (decisionMaker) {
                leadData.decisionMakerName = decisionMaker.name;
                leadData.decisionMakerRole = decisionMaker.role;
            }

            // Calculate lead score
            leadData.leadScore = calculateLeadScore(leadData);

            // Filter by industry if specified
            if (targetIndustry && leadData.industry !== targetIndustry) {
                console.log(`Skipping ${request.url} - Industry mismatch`);
                return;
            }

            // Save to dataset
            await Actor.pushData(leadData);
            console.log(`✓ Successfully scraped: ${leadData.companyName || request.url}`);

        } catch (error) {
            console.error(`Error scraping ${request.url}:`, error.message);
            leadData.errors.push(error.message);
            await Actor.pushData(leadData);
        }
    },

    failedRequestHandler({ request, error }) {
        console.error(`Request ${request.url} failed:`, error.message);
    },

    maxRequestsPerCrawl: maxResults,
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: 60,
});

// Run the crawler
await crawler.run(startUrls);

console.log('Lead scraping completed!');
await Actor.exit();