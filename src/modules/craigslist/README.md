# Craigslist Module

This module provides a Craigslist search API that allows searching across all Craigslist sites with filtering by categories and other options.

## Features

- Search across all Craigslist sites or a specific subset
- Filter by categories and subcategories
- Get detailed information about listings
- Access to all Craigslist cities worldwide
- Comprehensive category filtering

## Endpoints

### GET `/craigslist/cities`

Returns a list of all available Craigslist city site codes.

**Response:**
```json
{
  "count": 500,
  "cities": ["auburn", "bham", "dothan", ...]
}
```

### GET `/craigslist/categories`

Returns a list of all Craigslist categories and subcategories with their codes.

**Response:**
```json
{
  "categories": {
    "community": {
      "name": "Community",
      "code": "ccc",
      "subcategories": { ... }
    },
    ...
  }
}
```

### POST `/craigslist/search`

Searches Craigslist across multiple cities.

**Request Body:**
```json
{
  "query": "macbook pro",
  "category": "sya",
  "cities": ["seattle", "portland", "sfbay"],
  "maxCities": 5,
  "filters": {
    "min_price": 500,
    "max_price": 1500,
    "has_image": 1
  }
}
```

**Parameters:**
- `query` (string, optional): Search query
- `category` (string, optional): Category code to search in (e.g., "sya" for computers)
- `cities` (array, optional): Array of city codes to search (empty for all cities)
- `maxCities` (number, optional): Maximum number of cities to search at once (default: 5)
- `filters` (object, optional): Additional filters for the search

**Response:**
```json
{
  "query": "macbook pro",
  "category": "sya",
  "cities": ["seattle", "portland", "sfbay"],
  "totalCities": 3,
  "searchedCities": 3,
  "count": 42,
  "results": [
    {
      "id": "12345678",
      "title": "MacBook Pro 16\" 2019",
      "url": "https://seattle.craigslist.org/see/sya/d/seattle-macbook-pro-16-2019/12345678.html",
      "price": "$1200",
      "date": "2023-05-10T12:30:45-0700",
      "location": "Downtown",
      "imageUrl": "https://images.craigslist.org/abcdef_300x300.jpg",
      "city": "seattle"
    },
    ...
  ]
}
```

### POST `/craigslist/details`

Gets detailed information about a specific Craigslist posting.

**Request Body:**
```json
{
  "url": "https://seattle.craigslist.org/see/sya/d/seattle-macbook-pro-16-2019/12345678.html"
}
```

**Parameters:**
- `url` (string, required): URL of the Craigslist posting

**Response:**
```json
{
  "details": {
    "title": "MacBook Pro 16\" 2019",
    "price": "$1200",
    "description": "Selling my MacBook Pro...",
    "postingDate": "2023-05-10 12:30",
    "images": [
      "https://images.craigslist.org/abcdef_600x450.jpg",
      ...
    ],
    "attributes": {
      "make": "Apple",
      "model": "MacBook Pro",
      "condition": "excellent"
    },
    "location": {
      "latitude": "47.6062",
      "longitude": "-122.3321"
    },
    "url": "https://seattle.craigslist.org/see/sya/d/seattle-macbook-pro-16-2019/12345678.html"
  }
}
```

## MCP Tool

This module provides an MCP tool that can be used by other modules or external clients.

### Tool: `craigslist`

**Description:** Search across Craigslist sites with filtering by categories

**Parameters:**
- `query` (string, optional): Search query
- `category` (string, optional): Category code to search in
- `cities` (array, optional): Array of city codes to search (empty for all cities)
- `maxCities` (number, optional): Maximum number of cities to search at once
- `filters` (object, optional): Additional filters for the search

## Common Category Codes

Here are some common category codes you can use:

| Category | Code | Description |
|----------|------|-------------|
| All For Sale | sss | All items for sale |
| Community | ccc | Community events, activities, etc. |
| Housing | hhh | Apartments, houses, etc. |
| Jobs | jjj | Job listings |
| Services | bbb | Services offered |
| Gigs | ggg | Short-term work opportunities |
| Discussion Forums | fff | Discussion forums |

For subcategories, refer to the `/craigslist/categories` endpoint.

## Common Filters

Here are some common filters you can use:

| Filter | Description | Values |
|--------|-------------|--------|
| min_price | Minimum price | Number |
| max_price | Maximum price | Number |
| has_image | Only show posts with images | 1 (yes) |
| postedToday | Only show posts from today | 1 (yes) |
| bundleDuplicates | Bundle duplicate posts | 1 (yes) |
| searchDistance | Search radius in miles | Number |
| postal | Postal/ZIP code to search near | String |

## Usage Examples

### Basic Search

```javascript
// Search for "bicycle" in Seattle and Portland
const response = await fetch('/tools/craigslist', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "bicycle",
    cities: ["seattle", "portland"],
    category: "bia" // Bikes category
  })
});

const data = await response.json();
console.log(`Found ${data.count} bicycles`);
```

### Search with Filters

```javascript
// Search for apartments in New York with price range
const response = await fetch('/tools/craigslist', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category: "apa", // Apartments category
    cities: ["newyork"],
    filters: {
      min_price: 1500,
      max_price: 3000,
      bedrooms: 2,
      bathrooms: 1,
      has_image: 1
    }
  })
});

const data = await response.json();
console.log(`Found ${data.count} apartments`);
```

## Dependencies

This module requires the following npm packages:
- node-fetch
- jsdom

## Notes

- Craigslist may rate-limit excessive requests. The module limits the number of cities searched at once to avoid this.
- This module does not use the official Craigslist API (which doesn't exist) but instead parses the HTML of Craigslist pages.
- The structure of Craigslist pages may change, which could break this module.