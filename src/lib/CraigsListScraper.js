let Promise = require('bluebird')
let Cheerio = require('cheerio')
let http = require('http')


const SEARCH_STR = '/search/cto?'

const SOURCES = [
  'https://abbotsford.craigslist.ca',
  'https://bellingham.craigslist.org',
  'https://comoxvalley.craigslist.ca',
  'https://kamloops.craigslist.ca',
  'https://kelowna.craigslist.ca',
  'https://kootenays.craigslist.ca',
  'https://nanaimo.craigslist.ca',
  'https://seattle.craigslist.org',
  'https://sunshine.craigslist.ca',
  'https://vancouver.craigslist.ca',
  'https://victoria.craigslist.ca',
  'https://whistler.craigslist.ca'
]

const QUERIES = {
  MAX_PRICE: 'max_price',
  MAKE_MODEL: 'auto_make_model',
  QUERY: 'query',
  PICS: 'hasPic',
  MAX_MILES: 'max_auto_miles'
}

const DOM = {
  ROWS: 'ul.rows > li',
  LINK: '> a.result-image', // $('ul.rows > li').eq(0).find('a.result-image').attr('href')
  TITLE: 'p > a.result-title', // $('ul.rows > li').eq(0).find('p > a.result-title').text()
  PRICE: 'p > span > .result-price' // $('ul.rows > li').eq(0).find('p > span > .result-price').text()
}

_fetchAll(maxPrice, makeModel, query, maxMiles) {
  let results = []
  let searchString = SEARCH_STR + '?' +
                     QUERIES.QUERY + '=' + query + '&' +
                     QUERIES.MAX_PRICE + '=' + maxPrice + '&' +
                     QUERIES.MAKE_MODEL + '=' + makeModel + '&' +
                     QUERIES.MAX_MILES + '=' + maxMiles

  for (let i = 0; i < SOURCES.length; i++) {
    _fetchContentForUrl(SOURCES[i] + searchString)
      .then((data) => {
        let $ = Cheerio.load(data)
        let rows = $(DOM.ROWS)

        for (let j = 0; j < rows.length; j++) {
          results.push(_parseRow(rows.eq(j))
        }
      })
  }
}

_fetchContentForUrl(url) {
  console.log('Fetching: ' + url)
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = ""
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve(data)
        console.log('Content fetched for: ' + url)
      })
    })
  })
}

_parseRow(rowDomSelector) {

}

scrape(...query) {
  return _fetchAll()
}

module.exports = { scrape }
