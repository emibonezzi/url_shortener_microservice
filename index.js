require('dotenv').config();
const express = require('express');
const cors = require('cors');
let bodyParser = require('body-parser')
const app = express();
const dns = require('node:dns');
const exp = require('constants');
const { url } = require('node:inspector');
const parseUrl = require('parse-url');
const { runInNewContext } = require('node:vm');
const mongoose = require('mongoose')

//connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
})

// create URL schema
const urlSchema = new mongoose.Schema(
  {
    original_url: String,
    short_url: Number
  }
)

// create URL model
let URLModel = new mongoose.model('URLModel', urlSchema)

// Body parsing middleware to handle the POST requests
app.use(bodyParser.urlencoded({ extended: false }))

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// URL POST endpoint
app.post('/api/shorturl', function (req, res) {
  try {
    // Parse incoming URL to check if it's in valid format
    const hostname = parseUrl(req.body.url).resource
    // Check if URL actually exists   
    dns.lookup(hostname, function (err, family, address) {
      if (err) {
        res.send("<h1> URL not found </h1>")
      }
      else {
        URLModel.findOne({ original_url: req.body.url }).then(data => {
          if (data) {
            res.json({ original_url: data.original_url, short_url: data.short_url })
          } else {
            // fetch last short_url number
            URLModel.findOne().sort('-_id').then(data => {
              // if first entry 
              if (data) {
                // add new entry with last short_url number + 1
                let urlObj = new URLModel({
                  original_url: req.body.url,
                  short_url: data.short_url + 1
                })

                urlObj.save().then(data => res.json({ original_url: data.original_url, short_url: data.short_url }))
              }
              else {
                // add new entry with last short_url number + 1
                let urlObj = new URLModel({
                  original_url: req.body.url,
                  short_url: 1
                })

                urlObj.save().then(data => res.json(data))
              }

            })


          }
        })
      }
    })

  } catch (e) {
    res.json({ error: 'invalid url' })
  }
})

app.get('/api/shorturl/:number', function (req, res) {
  // find URL in db
  URLModel.findOne({ short_url: req.params.number }).then(data => {
    if (data) {
      // redirect to original url
      res.redirect(data.original_url)
    } else {
      res.send('<h1> URL not found </h1>')
    }

  })
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
