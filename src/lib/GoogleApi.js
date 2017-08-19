let Google = require('googleapis')
let GoogleAuth = require('google-auth-library')

let fs = require('fs')
let readLine = require('readline')

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
]
const ROOT_PATH = process.cwd()
const TOKEN_DIR = ROOT_PATH + '/.credentials/'
const TOKEN_PATH = TOKEN_DIR + 'gmail_credentials.json'
const CLIENT_SECRET_PATH = ROOT_PATH + '/src/config/client_secret.json'

fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(error, content) {
  if (error) {
    console.log('Cannot load client secret file: ' + error)
    return
  }

  authorize(JSON.parse(content), listLabels)
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} cb The callback to call with the authorized client.
 */
function authorize(credentials, cb) {
  let clientSecret = credentials.web.client_secret
  let clientId = credentials.web.client_id
  let redirectUrl = credentials.web.redirect_uris[0]
  let auth = new GoogleAuth()
  let oAuth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

  // Check for previously stored token
  fs.readFile(TOKEN_PATH, function(error, token) {
    if (error) {
      getNewToken(oAuth2Client, cb)
    } else {
      oAuth2Client.credentials = JSON.parse(token)
      cb(oAuth2Client)
    }
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} cb The callback to call with the authorized
 *     client.
 */
function getNewToken(oAuth2Client, cb) {
  let authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    client_id: oAuth2Client.clientId_,
    redirect_uri: oAuth2Client.redirectUri_
  })

  console.log('Authorize by following this URL: ' + authUrl)

  let rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Enter the code from that page here: ', function(code) {
    rl.close()

    oAuth2Client.getToken(code, function(error, token) {
      if (error) {
        console.log('Error while trying to retrieve access token ', error)
        return
      }
      oAuth2Client.credentials = token
      storeToken(token)
      cb(oAuth2Client)
    })
  })
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR)
  } catch (error) {
    if (error.code != 'EEXIST') {
      throw error
    }
  }

  fs.writeFile(TOKEN_PATH, JSON.stringify(token))
  console.log('Token stored at: ' + TOKEN_PATH)
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  var gmail = Google.gmail('v1')

  gmail.users.labels.list({
    auth: auth,
    userId: 'me'
  },(error, response) => {
    if (error) {
      console.log('The Google API returned an error: ' + error)
      return
    }

    let labels = response.labels

    if (labels.length === 0) {
      console.log('Google API: No labels found')
    } else {
      console.log('Google API: Labels:')

      for (let i = 0; i < labels.length; i++) {
        let label = labels[i]
        console.log('- %s', label.name)
      }
    }
  })
}
