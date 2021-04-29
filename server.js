const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();
const fs = require('fs');
// window.localStorage();

const conInfo = { host: 'localhost', user: 'root', password: '', database: 'GameDb' };
const sessionOptions = { secret: 'happy jungles', resave: false, saveUninitialized: false, cookie: { maxAge: 600000 } };
app.use(session(sessionOptions));

const connection = mysql.createConnection(conInfo);
connection.connect(function (err) {
  if (err) throw err;
});
const emailRegEx = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const passwordRegEx = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

app.get('/', serveIndex);
app.get('/whoIsLoggedIn', whoIsLoggedIn);
app.get('/game', game);
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);
app.listen(3000, 'localhost', startHandler());

function startHandler() {
  console.log('Server listening on port 3000');
}

function serveIndex(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  let index = fs.readFileSync('index.html');
  res.end(index);
}

const con = mysql.createConnection(conInfo);
con.connect(function (err) {
  if (err)
    throw err;
});

function whoIsLoggedIn(req, res) {
  if (req.session.user == undefined)
    writeResult(req, res, { 'error': 'Nobody is logged in.' });
  else
    writeResult(req, res, req.session.user);
}

function register(req, res) {
  if (req.query.email == undefined || !validateEmail(req.query.email)) //to do : add in validation function
  {
    writeResult(req, res, { 'error': 'Please specify a valid email' });
    return;
  }

  if (req.query.password == undefined || !validatePassword(req.query.password)) //to do : add in validation
  {
    writeResult(req, res, { 'error': 'Password must have a minimum of eight characters, at least one letter and one number' });
    return;
  }
  let hash = bcrypt.hashSync(req.query.password, 12);
  con.query('INSERT INTO Users (Email, Pass) VALUES (?, ?)', [req.query.email, hash], function (err, result, fields) {
    if (err) {
      if (err.code == 'ER_DUP_ENTRY')
        err = 'User account already exists.';
      writeResult(req, res, { 'error': err });
    }
    else {
      con.query('SELECT * FROM Users WHERE Email = ?', [req.query.email], function (err, result, fields) {
        if (err)
          writeResult(req, res, { 'error': err });
        else {
          req.session.user = { 'result': { 'id': result[0].UserId, 'email': result[0].Email } };
          writeResult(req, res, req.session.user);
        }
      });
    }
  });
}


function login(req, res) {
  if (req.query.email == undefined) {
    writeResult(req, res, { 'error': 'Email is required' });
    return;
  }

  if (req.query.password == undefined) {
    writeResult(req, res, { 'error': 'Password is required' });
    return;
  }

  con.query('SELECT FROM Users WHERE Email = ?', [req.query.email], function (err, result, fields) {
    if (err) {
      writeResult(req, res, { 'error': err });
    }
    else {
      if (result.length == 1 && bcrypt.compareSync(req.query.password, result[0].Pass)) {
        req.session.user = { 'result': { 'id': result[0].UserId, 'email': result[0].Email } };
        writeResult(req, res, req.session.user);
      }
      else {
        writeResult(req, res, { 'error': 'Invalid email/password' });
      }
    }
  });

}

function logout(req, res) {
  req.session.user = undefined;
  writeResult(req, res, { result: 'Nobody is logged in.' });
}


function game(req, res) {
  let result = {};
  try {
    if (!req.session.answer) { resetGame(req); }
    if (req.query.guess == undefined) {
      resetGame(req);
      result = { gameStatus: 'Pick a number from 1 to 100.', guesses: req.session.guesses, gameOver: false };
    }
    else {
      result = evaluateGuess(req, res);
    }
  }
  catch (e) {
    result = handleError(e);
  }
  if (result) { writeResult(req, res, result); }
}


// function getEmail(req) 
// {
//   return String(req.query.email).toLowerCase();
// }

function validateEmail(Email) {
  if (!Email) return false;
  return emailRegEx.test(Email.toLowerCase());
}

function validatePassword(pass) {
  if (!pass) return false;
  return passwordRegEx.test(pass);
}



function resetGame(req) {
  let max = req.query.max || 100;

  req.session.guesses = 0;
  req.session.answer = Math.floor(Math.random() * max) + 1;
}




function evaluateGuess(req, res) {
  validateGuess(req);
  if (isGuessCorrect(req)) {
    incrementGuesses(req);
    result = winGame(req, res);
  }
  else if (isGuessTooHigh(req)) {
    incrementGuesses(req);
    result = { gameStatus: 'Too high. Guess again!', guesses: req.session.guesses, gameOver: false };
  }
  else {
    incrementGuesses(req);
    result = { gameStatus: 'Too low. Guess again!', guesses: req.session.guesses, gameOver: false };
  }
  return result;
}




function validateGuess(req) {
  let guess = parseInt(req.query.guess);
  let message = `Guess must be a number between 1 and ${req.session.max}.`;

  if (isNaN(guess)) { throw Error(message); }
  if (guess < 1 || guess > 100) { throw Error(message); }
}




function isGuessCorrect(req) {
  return req.query.guess == req.session.answer
}




function winGame(req, res) {
  req.session.answer = undefined;
  result = { gameStatus: `Correct! It took you ${req.session.guesses} guesses. Play Again!`, guesses: req.session.guesses, gameOver: true };

  //   con.query('INSERT INTO game (UserId, GameId) VALUES (?, ?)',[req.session.User.result.UserId, req.session.guesses], function (err, result, fields) {
  //   if (err) {
  //     if (err.code == 'ER_DUP_ENTRY')
  //     writeResult(req, res, { 'error': err });
  //   }
  // });

  // saveHigh(req);
  writeResult(req, res, result);
}


function incrementGuesses(req) {
  req.session.guesses += 1;
}



// function saveHigh(req) {
//   highscore = (req.session.guesses);
//   currentScore = (req.session.answer)
//   localStorage.setItem= ('highscore', highScore)
//   if (req.session.guesses > req.session.answer) {
//     highscore = req.session.answer + 1;
//     writeResult;
//   }

//   else {
//     highscore = ('highscore', currentScore);
//   }
// }


function isGuessTooHigh(req) {
  return req.query.guess > req.session.answer
}




function writeResult(req, res, result) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify(result));
  res.end('');
}



function handleError(e) {
  console.log(e.stack);
  return { error: e.message };
}