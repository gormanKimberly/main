DROP DATABASE IF EXISTS GameDb;

CREATE DATABASE GameDb;
USE GameDb;

CREATE TABLE Users
(
  UserId int NOT NULL AUTO_INCREMENT,
  Email varchar(255) UNIQUE NOT NULL,
  Pass varchar(60) NOT NULL,
  PRIMARY KEY (UserId)
);

CREATE TABLE game 
(
  gameId int NOT NULL AUTO_INCREMENT,
  UserId int NOT NULL,
   -- SONG_NAME varchar(255) NOT NULL,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  PRIMARY KEY (gameId)
);