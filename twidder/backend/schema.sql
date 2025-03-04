CREATE TABLE User(
    Email TEXT NOT NULL PRIMARY KEY,
    PasswordHash TEXT NOT NULL,

    FirstName TEXT NOT NULL,
    FamilyName TEXT NOT NULL,
    Gender TEXT NOT NULL,
    City TEXT NOT NULL,
    Country TEXT NOT NULL
);

INSERT INTO User VALUES (
    "a@a.ca", 
    "$2b$12$CqQZjBFBTlWxM5pfEsMEyusSDUcEcIGm2Vtm4dj8H9/ETPIyBDtu6",
    "Firstt",
    "Familyy",
    "Female",
    "Linkoping",
    "Sweden"
);

INSERT INTO User VALUES (
    "a@a.cb", 
    "$2b$12$CqQZjBFBTlWxM5pfEsMEyusSDUcEcIGm2Vtm4dj8H9/ETPIyBDtu6",
    "Nobody",
    "Idk",
    "Non-Binary",
    "Linkoping2",
    "Sweden2"
);

CREATE TABLE Session(
    Token TEXT NOT NULL PRIMARY KEY,
    Email TEXT NOT NULL,
    FOREIGN KEY(Email) REFERENCES User(Email)
);

CREATE TABLE Message(
    Recipient TEXT NOT NULL,
    Author TEXT NOT NULL,
    Contents TEXT NOT NULL, 
    FOREIGN KEY(Recipient) REFERENCES User(Email)
    FOREIGN KEY(Author) REFERENCES User(Email)
);

INSERT INTO Message VALUES ("a@a.ca", "a@a.ca", "Hello :3");