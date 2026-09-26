# SerpApi for rank tracking

OpenSEO uses SerpApi's Google Search API for fresh desktop and mobile rank
checks. Keyword volume, difficulty, and CPC enrichment remain separate.

## Configure locally

1. Copy your private key from https://serpapi.com/manage-api-key.
2. Add it to the local environment file:

   ```dotenv
   SERPAPI_API_KEY=your-private-key
   ```

3. Restart the development server.

## Request behavior

- One Google result page uses one SerpApi search credit.
- Each keyword/device pair starts at page one and stops when the tracked domain
  is found or the configured depth is reached.
- Local targeting sends the selected SerpApi canonical location.
- Rank checks force fresh results with `no_cache=true`.
- Location autocomplete uses SerpApi's free Locations API.

At a depth of 100, one keyword can use up to 10 searches per device. Tracking
both desktop and mobile can therefore use up to 20 searches per keyword/run.
