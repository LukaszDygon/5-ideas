"""
Main entry point for 5 Ideas Daily Showcase.
Runs the FastAPI site and admin on http://localhost:8000 (use --port to change).
"""

import argparse

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the 5 Ideas Daily Showcase dev server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-reload", action="store_true", help="disable auto-reload")
    args = parser.parse_args()

    base = f"http://{args.host}:{args.port}"
    print(f"🚀 Starting 5 Ideas Daily Showcase on {base}")
    print(f"   • Front Page & Top Picks: {base}/")
    print(f"   • Calendar (Biggest View): {base}/calendar")
    print(f"   • Day-by-Day Stream: {base}/stream")
    print(f"   • Design System Gallery: {base}/design-system")
    print(f"   • Admin Dashboard: {base}/admin")
    print(f"   • Interactive Swagger Docs: {base}/docs")
    uvicorn.run("showcase.web:app", host=args.host, port=args.port, reload=not args.no_reload)


if __name__ == "__main__":
    main()
