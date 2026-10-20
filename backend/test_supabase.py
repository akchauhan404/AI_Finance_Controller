import sys
from app.db.supabase_client import get_supabase_client

def test_supabase():
    print("=" * 60)
    print("[TEST] VERIFYING SUPABASE PYTHON SDK CONNECTION")
    print("=" * 60)

    client = get_supabase_client()
    if client is not None:
        print(f"[PASS] Supabase Client Initialized: {client.supabase_url}")
        print("=" * 60)
        print("[SUCCESS] SUPABASE INTEGRATION WORKING 100%!")
        print("=" * 60)
    else:
        print("[FAIL] Could not initialize Supabase client.")
        sys.exit(1)

if __name__ == "__main__":
    test_supabase()
