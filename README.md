# Company Finder Actor

Search for companies by industry and location. Returns a list of company names, domains, and locations. Each run provides different results through randomized search queries.

## Features

✅ **Industry-Based Search** - Find companies in any industry  
✅ **Location-Based Search** - Search companies in specific locations  
✅ **Company Information** - Get company names, domains, and locations  
✅ **Variety** - Different results on every run through query randomization  
✅ **Minimum Results** - Guarantees at least 10 companies per search  

## Input

Configure the actor with these parameters:

```json
{
  "industry": "Technology",
  "location": "New York",
  "maxResults": 20,
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

### Parameters

- **industry** (required): Industry name to search for
  - Examples: "Technology", "Healthcare", "Restaurant", "Law Firm", "Marketing Agency"
  
- **location** (required): Location to search in
  - Examples: "New York", "San Francisco, CA", "London, UK", "Toronto, Canada"
  
- **maxResults** (optional): Maximum number of companies to find
  - Default: 20
  - Minimum: 10
  - Maximum: 100

- **proxyConfiguration** (optional): Proxy settings for scraping
  - Default: Uses Apify Proxy

## Output

Each company record contains:

```json
{
  "companyName": "Example Tech Corp",
  "domain": "exampletech.com",
  "location": "New York, NY",
  "industry": "Technology",
  "scrapedAt": "2024-01-15T10:30:00.000Z"
}
```

### Output Fields

- **companyName**: Name of the company
- **domain**: Company website domain (or "N/A" if not found)
- **location**: Company location/address
- **industry**: The industry you searched for
- **scrapedAt**: Timestamp when the data was scraped

## Usage Examples

### Example 1: Find Technology Companies in New York

```json
{
  "industry": "Technology",
  "location": "New York",
  "maxResults": 20
}
```

### Example 2: Find Restaurants in San Francisco

```json
{
  "industry": "Restaurant",
  "location": "San Francisco, CA",
  "maxResults": 15
}
```

### Example 3: Find Law Firms in London

```json
{
  "industry": "Law Firm",
  "location": "London, UK",
  "maxResults": 25
}
```

## How It Works

1. **Search Query Building**: Creates a search query combining industry and location
2. **Randomization**: Adds random terms to get different results on each run
3. **Google Maps Search**: Searches Google Maps for business listings
4. **Data Extraction**: Extracts company names, domains, and locations
5. **Deduplication**: Removes duplicate companies
6. **Result Guarantee**: Ensures at least 10 companies are returned

## Different Results on Each Run

The actor uses query randomization to provide different results:
- Adds random terms like "best", "top", "leading", "premier" to search queries
- Searches multiple variations of the query
- This ensures variety in results across different runs

## Limitations

⚠️ **Important Notes:**

- **Success Rate**: May not always find websites for all companies (some may show "N/A")
- **Search Results**: Results depend on Google Maps/Search availability and indexing
- **Rate Limits**: Uses reasonable delays to respect service terms
- **Location Accuracy**: Location data depends on what's available in search results
- **Domain Extraction**: Some companies may not have publicly listed websites

## Use Cases

- **Lead Generation**: Build lists of companies in specific industries and locations
- **Market Research**: Find competitors or businesses in target markets
- **Sales Prospecting**: Identify potential clients in specific geographic areas
- **Business Development**: Discover companies for partnerships or collaborations
- **Industry Analysis**: Gather data on companies in specific sectors

## Technical Details

- **Runtime**: Node.js 20 with Puppeteer
- **Browser**: Chrome (headless)
- **Search Sources**: Google Maps and Google Search
- **Concurrency**: 1 (sequential processing for stability)
- **Timeout**: 60 seconds per request
- **Memory**: 2048 MB recommended

## Error Handling

The actor gracefully handles:
- ✅ Timeout errors
- ✅ Network failures
- ✅ Missing data fields
- ✅ Duplicate companies
- ✅ Insufficient results (tries alternative search methods)

## Tips for Best Results

1. **Be Specific**: Use specific industry terms (e.g., "Software Development" instead of just "Technology")
2. **Location Format**: Include city and state/country for better results (e.g., "San Francisco, CA")
3. **Industry Variations**: Try different industry terms if initial results are limited
4. **Multiple Runs**: Run multiple times to get different sets of companies
5. **Use Proxies**: Enable Apify Proxy to avoid rate limiting

## Export Options

After scraping, download data as:
- **CSV**: For Excel/Google Sheets
- **JSON**: For API integrations
- **Excel**: For immediate use in Microsoft Office

## Support

For issues or feature requests:
- Check the Apify Forum
- Review Crawlee Documentation
- Contact actor developer

## License

Apache-2.0
