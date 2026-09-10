"""
Main entry point for 5 Ideas Daily Showcase.
Runs FastAPI + Flask Admin on http://localhost:8000.
"""

import uvicorn


def main():
    print("🚀 Starting 5 Ideas Daily Showcase on http://localhost:8000")
    print("   • Front Page & Top Picks: http://localhost:8000/")
    print("   • Calendar (Biggest View): http://localhost:8000/calendar")
    print("   • Day-by-Day Stream: http://localhost:8000/stream")
    print("   • Design System Gallery: http://localhost:8000/design-system")
    print("   • Flask Admin Dashboard: http://localhost:8000/admin")
    print("   • Interactive Swagger Docs: http://localhost:8000/docs")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
