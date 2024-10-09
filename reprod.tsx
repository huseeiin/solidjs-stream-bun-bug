import { createAsync, Route, Router } from "@solidjs/router";
import { createServerAdapter } from "@whatwg-node/server";
import {
  generateHydrationScript,
  renderToStream,
  Suspense,
} from "solid-js/web";
import { provideRequestEvent } from "solid-js/web/storage";
import { createServer } from "http";

function Home() {
  const data = createAsync(async () => Bun.version);

  return (
    <Suspense>
      <h1>Bun v{data()}</h1>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
    </Router>
  );
}

const html = (await Bun.file("index.html").text()).replace(
  "<!-- head -->",
  generateHydrationScript()
);

const [start, end] = html.split("<!-- root -->");

const server = (req: Request) => {
  const { pathname } = new URL(req.url);
  if (pathname === "/favicon.ico")
    return new Response("Not Found", { status: 404 });
  return provideRequestEvent(
    { request: req, response: { headers: new Headers() } },
    async () => {
      const { readable, writable } = new TransformStream<Uint8Array, string>({
        start(controller) {
          controller.enqueue(start);
        },
        flush(controller) {
          controller.enqueue(end);
        },
      });
      renderToStream(App).pipeTo(writable);
      return new Response(readable);
    }
  );
};

// this works (using node:http under the hood)
createServer(createServerAdapter(server)).listen(3000);

// but this doesn't:
// Bun.serve({ fetch: server });
