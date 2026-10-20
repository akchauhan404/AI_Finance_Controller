import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mwbnjkvpittsgdyztzgn.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_lGcU1XZ-XWywZ72yAv2ZEw_rwUVBqqf")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"[SUPABASE] Client initialized successfully for: {SUPABASE_URL}")
    except Exception as err:
        print(f"[SUPABASE] Initialization Warning: {err}")

def get_supabase_client() -> Client:
    return supabase
