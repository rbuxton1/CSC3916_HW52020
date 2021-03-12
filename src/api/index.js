const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const ejwt = require('express-jwt');
const bodyParser = require('body-parser');
const auth = require('basic-auth');
require('dotenv').config(); //annoying
const path = require("path"); //hacky

//Mongo noise
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var uri = "mongodb+srv://testUser:" + process.env.DBPASS + "@cluster0.g6s6w.mongodb.net/hw3?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());
const token = process.env.TOKEN || "somethingsomethingsuperdupertricky";

//sneaky
app.use(express.static(path.join(__dirname, "..", "..", "build")));
app.use((req, res, next) =>{
  res.sendFile(path.join(__dirname, "..", "..", "build"));
})

app.post("/signup", (req, res) => {
  var {username, password} = req.body;
  var hashedPass = require('crypto').createHash('md5').update(password).digest('hex');
  if(!username || !password) res.send({success:false, msg:"Need both username and password!"});
  else {
    client.connect(err => {
      if(!err){
        var users = client.db("hw3").collection("users");
        users.find({ username: username }).toArray((err2, arr) => {
          if(!err2){
            if(arr.length == 0){
              users.insertOne({username, password: hashedPass, role: "user"}, (err3, insRes) => {
                if(!err3) res.send({success: true, msg:"Successfully created new user."});
                else res.send(err3);
              });
            } else {
              res.send({success: false, msg:"Username already in use."});
            }
          } else res.send(err2);
        });
      } else res.send(err);
    });
  }
});

app.post("/signin", (req, res) => {
  var {username, password} = req.body;
  var hashedPass = require('crypto').createHash('md5').update(password).digest('hex');
  client.connect(err => {
    if(!err){
      client.db("hw3").collection("users").find({username: username, password: hashedPass}).toArray((err2, arr) => {
        if(!err2){
          if(arr.length == 1){
            var user = arr[0];
            var signed = jwt.sign({username: user.username, role: user.role}, token);
            res.send({success: true, token: signed });
          } else res.sendStatus(401);
        } else res.send(err2)
      })
    } else res.send(err);
  })
});

app.get("/movies", (req, res) => {
  var {headers, query} = req;
  //res.send({status: 200, message: "GET movies", headers, query, env: token});
  client.connect(err => {
    if(!err){
      const movies = client.db("hw3").collection("movies");
      movies.find().toArray((err2, arr) => {
        if(!err2) res.send(arr);
        else res.send(err2)
      });
    } else res.send(err);
  });
});

app.post("/movies", ejwt({ secret: token, algorithms: ['HS256'] }), (req, res) => {
  var {title, year, genre, actors} = req.body;
  if(!title || !year || !genre || !actors) res.send({success:false, msg:"Needs all components."});
  else {
    client.connect(err => {
      if(!err){
        client.db("hw3").collection("movies").insertOne({title: title, year: year, genre: genre, actors: actors}, (err2, insRes) => {
          if(!err2) res.send({success: true, msg:"Movie added.", id: insRes.insertedId});
          else res.send(err2);
        });
      } else res.send(err);
    });
  }
});

app.put("/movies", ejwt({ secret: token, algorithms: ['HS256'] }), (req, res) => {
  var id = req.query.id;
  var {title, year, genre, actors} = req.body;
  var update = JSON.parse(JSON.stringify({ title, year, genre, actors })); //removes the undefines, makes my life easy.
  if(!id) res.send({success: false, msg:"Requires movie ID"});
  else {
    client.connect(err => {
      if(!err){
        client.db("hw3").collection("movies").updateOne({ _id: ObjectId(id) }, { $set: update }, (err2, updRes) => {
          if(!err2) res.send({success: true, msg:"Movie updated."});
          else res.send(err2);
        })
      } else res.send(err);
    });
  }
});

app.delete("/movies", ejwt({ secret: token, algorithms: ['HS256'] }), (req, res) => {
  var id = req.query.id;
  if(!id) res.send({success: false, msg:"Requires movie ID"});
  else {
    client.connect(err => {
      if(!err){
        client.db("hw3").collection("movies").deleteOne({ _id: ObjectId(id) }, (err2, updRes) => {
          if(!err2) res.send({success: true, msg:"Movie deleted."});
          else res.send(err2);
        })
      } else res.send(err);
    });
  }
});

app.all('*', function(req, res){
   res.status(403).end();
});

app.listen(process.env.PORT || 8008, () => {
  console.log("Listening!")
  //console.log("listening, token is " + token);
  //console.log("pass is " + uri);
});
