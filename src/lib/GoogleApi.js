let Google = require('googleapis')
let GoogleAuth = require('google-auth-library')

let fs = require('fs')
let readLine = require('readline')

const CONSOLE_COLORS = {
  'red': "\x1b[31m%s\x1b[0m",
  'green': "\x1b[32m%s\x1b[0m",
  'yellow': "\x1b[33m%s\x1b[0m",
  'cyan': "\x1b[36m%s\x1b[0m"
}

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
]

const ERRORS = {
  ACCESS_TOKEN : 'Error while trying to retrieve access token: ',
  GOOGLE_API : 'The Google API returned an error: ',
  MSG_NO_SENDER : 'Error Formatting Message: No Authorized Sender Email Address.',
  MSG_NO_RECIPIENT : 'Error Formatting Message: No Recipient Email Address.',
  REQUEST_ERROR: 'Request Error: ',
  REQUEST_AUTH_ERROR: 'Ensure that authorization takes place correctly. If problem persists, try deleting the file in /.credentials/gmail_credentials.json.',
  CLIENT_SECRET: 'Cannot load client secret file: '
}

const ROOT_PATH = process.cwd()
const TOKEN_DIR = ROOT_PATH + '/.credentials/'
const TOKEN_PATH = TOKEN_DIR + 'gmail_credentials.json'
const CLIENT_SECRET_PATH = ROOT_PATH + '/src/config/client_secret.json'

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} cb The callback to call with the authorized client.
 */
function _authorize(credentials, cb, args) {
  let clientSecret = credentials.web.client_secret
  let clientId = credentials.web.client_id
  let redirectUrl = credentials.web.redirect_uris[0]
  let auth = new GoogleAuth()
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
      console.log(CONSOLE_COLORS['green'], 'Google API: Successfully auhtorized.')

      if (cb) {
        cb(oAuth2Client, args)
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

  console.log(CONSOLE_COLORS['cyan'], 'Authorize by following this URL: ' + authUrl)

  let rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Enter the code from that page here: ', function(code) {
    rl.close()

    oAuth2Client.getToken(code, function(error, token) {
      if (error) {
        console.log(CONSOLE_COLORS['red'], ERRORS['ACCESS_TOKEN']  + error)
        return
      }
      oAuth2Client.credentials = token
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
      console.log(CONSOLE_COLORS['red'], ERRORS['GOOGLE_API'] + error)
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
 * Gmail API requires MIME email messages compliant with RFC 2822.
 *
 * @param {String} senderEmail Email address of user whose credentials are in .credentials/gmail_credentials.json
 * @param {String} recipientEmail The email address of the recipient
 * @param {String} subject The message subject (optional)
 * @param {String} messageBody The body of the eamil message (optional)
 */
function formatMessage(senderEmail, recipientEmail, subject, messageBody) {
  if (!senderEmail) {
    console.log(CONSOLE_COLORS['red'], ERROR['MSG_NO_SENDER'])
    return
  }

  if (!recipientEmail) {
    console.log(CONSOLE_COLORS['red'], ERROR['MSG_NO_RECIPIENT'])
    return
  }

  let email = "Content-Type: text/plain; charset=\"UTF-8\"\n" +
              "MIME-Version: 1.0\n" +
              "Content-Transfer-Encoding: 7bit\n" +
              "to: " + recipientEmail + "\n" +
              "from: " + senderEmail + "\n" +
              "subject: " + subject + "\n\n" +
              messageBody

  return new Buffer(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

function _sendMessage(auth, base64EncodedEmail) {
  if (!auth) {
    console.log(CONSOLE_COLORS['red'], "Authorization failed. Authorization is required to send a message.")
    return
  }
  if (!base64EncodedEmail) {
    console.log(CONSOLE_COLORS['red'], "Base 64 Encoded Email necessary. Message failed to send.")
    return
  }

  let gmail = Google.gmail('v1')

  let options = {
    auth: auth,
    userId: 'me',
    resource: {
      raw: base64EncodedEmail
    }
  }

  try {
    gmail.users.messages.send(options, function (error, request) {
      if (error) {
        console.log(CONSOLE_COLORS['red'], ERRORS['REQUEST_ERROR'] + error)
        return
      } else if (request) {
        console.log(CONSOLE_COLORS['green'], "Message sent.")
      }
    })
  } catch (e) {
    console.log(CONSOLE_COLORS['red'], ERRORS['REQUEST_ERROR'] + e)
    console.log(CONSOLE_COLORS['red'], ERRORS['REQUEST_AUTH_ERROR'])
  }

}

function authorizeAndSendMessage(base64EncodedEmail) {
  fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(error, content) {
    if (error) {
      console.log(CONSOLE_COLORS['red'], ERRORS['CLIENT_SECRET'] + error)
      return
    }

    _authorize(JSON.parse(content), _sendMessage, base64EncodedEmail)
  })
}

module.exports = { formatMessage, authorizeAndSendMessage }
