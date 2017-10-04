let Google = require('googleapis')
let GoogleAuth = require('google-auth-library')

let fs = require('fs')
let readLine = require('readline')

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
]

const ROOT_PATH = process.cwd()
const TOKEN_DIR = ROOT_PATH + '/.credentials/'
const TOKEN_PATH = TOKEN_DIR + 'gmail_credentials.json'
const CLIENT_SECRET_PATH = ROOT_PATH + '/src/config/client_secret.json'

let auth = null

fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(error, content) {
  if (error) {
    console.log('Cannot load client secret file: ' + error)
    return
  }

  authorize(JSON.parse(content))
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
  auth = new GoogleAuth()
  let oAuth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

  // Check for previously stored token
  fs.readFile(TOKEN_PATH, function(error, token) {
    if (error) {
      if (cb) {
        getNewToken(oAuth2Client, cb)
      } else {
        getNewToken(oAuth2Client)
      }
    } else {
      oAuth2Client.credentials = JSON.parse(token)
      console.log('Google API: Successfully auhtorized.')

      if (cb) {
        cb(oAuth2Client)
      }
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
      oAuth2Client.setCredentials(token)
      storeToken(token)
      if (cb) {
        cb(oAuth2Client)
      }
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

/**
 * Format the message contents such that it can be sent to the Gmail API.
 * Returns a formatted message in base 64 as the Gmail API expects.
 *
 * @param {String} senderEmail Email address of user whose credentials are in .credentials/gmail_credentials.json
 * @param {String} recipientEmail The email address of the recipient
 * @param {String} subject The message subject (optional)
 * @param {String} messageBody The body of the eamil message (optional)
 */
function formatMessage(senderEmail, recipientEmail, subject, messageBody) {
  if (!senderEmail) {
    console.log('Error Formatting Message: No Authorized Sender Email Address.')
    return
  }

  if (!recipientEmail) {
    console.log('Error Formatting Message: No Recipient Email Address.')
    return
  }

  let email = "From: " + senderEmail + "\r\n" +
              "To: " + recipientEmail + "\r\n" +
              "Subject: " + subject + + "\r\n" +
              "Content-Type: text/html; charset=utf-8\r\n" +
              "Content-Transfer-Encoding: base64\r\n\r\n" +
              messageBody

  return new Buffer(email, 'base64').toString('utf-8')
}

function sendMessage(base64EncodedEmail) {
  if (!auth) {
    console.log("Authorization not acquired.")
    return
  }

  let gmail = Google.gmail('v1')

  let options = {
    auth: auth,
    userId: 'me',
    uploadType: 'media',
    resource: {
      raw: base64EncodedEmail
    }
  }

  let request = gmail.users.messages.send(options)

  request.execute()
}


module.exports = { formatMessage, sendMessage }
