import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)

    cursor = conn.cursor()
    cursor.execute("SELECT NOW();")

    result = cursor.fetchone()

    print("Database connected successfully!")
    print("PostgreSQL server time:", result[0])

    cursor.close()
    conn.close()

except Exception as e:
    print("Database connection failed!")
    print("Error:", e)