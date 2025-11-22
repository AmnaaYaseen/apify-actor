Business Lead Scraper Actor
Extract comprehensive business lead information from company websites including contact details, decision makers, and website quality assessment.

Features
✅ Company Information

Company name
Website URL
Industry detection
Location/geography
Company size & type
✅ Decision Makers

Name extraction
Job role identification
✅ Contact Details

Email addresses
Phone numbers
Social media links (LinkedIn, Facebook, Twitter, Instagram)
✅ Website Analysis

Quality score (0-100)
Branding needs assessment
Technical metrics (SSL, mobile-ready, etc.)
✅ Lead Scoring

Automatic lead qualification (0-100)
Prioritizes actionable leads
Input
Configure the scraper with these parameters:

json
{
  "startUrls": [
    { "url": "https://example-company.com" },
    { "url": "https://another-company.com" }
  ],
  "maxResults": 50,
  "targetIndustry": "Technology",
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
Parameters
startUrls (required): List of company website URLs to scrape
maxResults (optional): Maximum number of companies to scrape (default: 50)
targetIndustry (optional): Filter by specific industry
proxyConfiguration (optional): Proxy settings for avoiding blocks
Output
Each scraped lead contains:

json
{
  "companyName": "Example Corp",
  "websiteUrl": "https://example.com",
  "industry": "Technology",
  "location": "San Francisco, CA",
  "companySize": null,
  "companyType": null,
  "decisionMakerName": "John Smith",
  "decisionMakerRole": "CEO",
  "email": "contact@example.com",
  "phone": "+1-555-0123",
  "linkedIn": "https://linkedin.com/company/example",
  "facebook": "https://facebook.com/example",
  "twitter": "https://twitter.com/example",
  "instagram": "https://instagram.com/example",
  "websiteQualityScore": 75,
  "websiteQualityRating": "Good",
  "brandingNeeds": false,
  "leadScore": 85,
  "scrapedAt": "2024-01-15T10:30:00.000Z",
  "errors": []
}
Usage Tips
1. Best Sources for URLs
Google Maps/Local Directories: Export business listings
LinkedIn Company Lists: Export company profiles
Industry Directories: Yellow Pages, Yelp, etc.
Manual Lists: CSV/Excel files with website URLs
2. Lead Score Interpretation
80-100: Hot leads (complete contact info, poor website quality = high need)
60-79: Warm leads (good contact info, some improvements needed)
40-59: Cold leads (limited contact info or well-established website)
0-39: Very cold leads (incomplete data)
3. Optimize Results
Start with maxResults: 10 to test
Use targetIndustry to focus on specific sectors
Enable Apify Proxy to avoid IP blocks
Run during off-peak hours for better performance
4. Export Options
After scraping, download data as:

CSV: For Excel/Google Sheets
JSON: For CRM integrations
Excel: For immediate use in Microsoft Office
Limitations
⚠️ Important Notes:

Success Rate: Not all websites will yield complete data (typical: 60-80% success)
Private Data: Cannot access content behind login walls
Dynamic Sites: Some modern JavaScript-heavy sites may not render fully
Rate Limits: Respect website terms of service; use reasonable concurrency
GDPR Compliance: Ensure you have legal basis for collecting/storing personal data
Use Cases
B2B Sales: Build targeted prospect lists
Marketing Agencies: Find potential clients needing web services
Business Development: Research companies in specific industries
Lead Generation: Create qualified lead databases
Market Research: Analyze competitor presence and quality
Technical Details
Runtime: Node.js 20 with Puppeteer
Browser: Chrome (headless)
Concurrency: 3 parallel scrapers
Timeout: 60 seconds per page
Memory: 2048 MB recommended
Error Handling
The actor gracefully handles:

✅ Timeout errors
✅ Network failures
✅ Missing data fields
✅ Invalid URLs
✅ Access denied (403/404)
Errors are logged in the errors array of each lead record.

Support
For issues or feature requests:

Check the Apify Forum
Review Crawlee Documentation
Contact actor developer
License
Apache-2.0

Pro Tip: Combine this scraper with email enrichment services (Hunter.io, Apollo.io) for even more complete lead data!

