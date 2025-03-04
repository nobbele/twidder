import os
import sqlite3
from .lib import BadRequestError, NotFoundError, SignUpData, UnauthorizedError, hash_password

def get_conn():
    return sqlite3.connect("database.db")

# if os.path.exists("database.db"):
#     os.remove("database.db")

# with get_conn() as con:
#     with open('twidder/backend/schema.sql') as fp:
#         con.executescript(fp.read())

class User:
    email: str
    firstname: str
    familyname: str
    gender: str
    city: str
    country: str

    def __init__(self, email, firstname, familyname, gender, city, country):
        self.email = email
        self.firstname = firstname
        self.familyname = familyname
        self.gender = gender
        self.city = city
        self.country = country

    def as_dict(self):
        return {
            "email": self.email,
            "firstname": self.firstname,
            "familyname": self.familyname,
            "gender": self.gender,
            "city": self.city,
            "country": self.country,
        }

class Message:
    author: str
    contents: str
    region: str | None

    def __init__(self, author, contents, region):
        self.author = author
        self.contents = contents
        self.region = region

    def as_dict(self):
        return {
            "author": self.author,
            "contents": self.contents,
            "region": self.region,
        }

def check_user_exists(email: str) -> bool:
    with get_conn() as con:
        res = con.execute("SELECT 1 FROM User WHERE Email = ?", (email,))
        res = res.fetchone()
        return res != None

def get_password_hash(email: str) -> str | None:
    with get_conn() as con:
        res = con.execute("SELECT PasswordHash FROM User WHERE Email = ?", (email,))

        res = res.fetchone()
        if res is None: raise NotFoundError("No such user.")

        (password_hash,) = res
        return password_hash

def get_user_by_email(email: str) -> User:
    with get_conn() as con:
        res = con.execute("SELECT Email, FirstName, FamilyName, Gender, City, Country FROM User WHERE Email = ?", (email,))

        res = res.fetchone()
        if res is None: raise NotFoundError("No such user.")

        (email, firstname, familyname, gender, city, country) = res
        return User(email, firstname, familyname, gender, city, country)

def insert_user(data: SignUpData):
    with get_conn() as con:
        con.execute("INSERT INTO User(Email, PasswordHash, FirstName, FamilyName, Gender, City, Country) VALUES (?, ?, ?, ?, ?, ?, ?)", (
            data.email,
            hash_password(data.password),
            data.firstname,
            data.familyname,
            data.gender,
            data.city,
            data.country
        ))

def change_password(email: str, new_password: str):
    with get_conn() as con:
        con.execute("UPDATE User SET PasswordHash = ? WHERE Email = ?", (new_password, email,))

def insert_session(token: str, email: str):
    with get_conn() as con:
        con.execute("INSERT INTO Session VALUES (?, ?)", (str(token).strip(), email))

def delete_session(token: str):
    with get_conn() as con:
        con.execute("DELETE FROM Session WHERE Token = ?", (token,))

def check_session(token: str):
    with get_conn() as con:
        res = con.execute("SELECT 1 FROM Session WHERE Token = ?", (str(token).strip(),))
        res = res.fetchone()
        return res != None

def try_get_email_from_session(token: str) -> str | None:
    with get_conn() as con:
        res = con.execute("SELECT Email FROM Session WHERE Token = ?", (str(token).strip(),))

        res = res.fetchone()
        if res is None: return None

        (email,) = res
        return email

def get_email_from_session(token: str) -> str | None:
    email = try_get_email_from_session(token)
    if email == None: raise Exception("Couldn't get email from token.")
    return email

def post_message(author: str, contents: str, recipient: str, region: str | None):
    with get_conn() as con:
        con.execute("INSERT INTO Message VALUES (?, ?, ?, ?)", (recipient, author, contents, region))

def get_user_messages(email: str):
    with get_conn() as con:
        res = con.execute("SELECT Author, Contents, Region FROM Message WHERE Recipient = ?", (email,))
        res = res.fetchall()

        return [Message(author, contents, region) for (author, contents, region) in res]