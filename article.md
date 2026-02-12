# Progressive disclosure on the headless agentic web

Years ago, when I was working on transport projects in London, the design team at TfL had a term for how they thought about signage: *phased disclosure*. You don't show a passenger the entire network map at the ticket barrier. You show them the next decision they need to make. Which line. Which direction. Which exit. Each sign reveals just enough for the next step, and the full picture assembles itself as you move through the system.

The web works the same way. You land on a page, you see what's available, you click a link. Each page reveals new links. You explore by following your nose, and the structure of the information space unfolds as you move through it. Progressive disclosure. The web's original interaction model.

When I designed HAL — the Hypertext Application Language — the goal was to bring this same principle to APIs. Make them discoverable the way the human web was. Give machines a root to start from, links to follow, and documentation to read at each step. Let the API's capabilities disclose themselves progressively, rather than requiring complete upfront knowledge.

It took a long time for that idea to find its proper client. I think it finally has.

## The API knowledge problem

Modern API integrations follow a rigid pattern: a human reads documentation, writes deterministic code, and ships it. The API's capabilities are frozen into that code at write time. If the API adds a new endpoint, the integration doesn't notice. If the response format shifts, the client breaks. The integration is a snapshot of a developer's understanding at a moment in time, calcified into `fetch` calls and hardcoded URLs.

This is a lot of upfront knowledge to require. You need an OpenAPI spec, or a client library, or at minimum a documentation site. You study the entire surface before you write a single line. The integration assumes complete knowledge from the start.

HATEOAS — Hypermedia As The Engine Of Application State — was the answer in principle. API responses should include links to related resources and available actions. The client wouldn't need hardcoded URLs because the API itself would tell it what to do next. Follow the links. Phased disclosure for machines. HAL was my attempt to make this practical: a minimal JSON format with `_links`, CURIEs for namespaced relations, and embedded resources. Enough structure for a client to navigate, without the ceremony of heavier hypermedia formats.

It never quite worked — not because the idea was wrong, but because the clients were wrong. A traditional HTTP client encountering an unfamiliar link relation like `wiki:v1:create-page` has no way to reason about what that means, what method to use, or what data to send. It needs to know in advance. So developers wrote the same hardcoded integrations they always had. The links were in the responses, but nobody was following them. Hypermedia APIs became an architectural curiosity — technically sound, practically ignored.

## The new client

LLMs change the equation. An agent encountering `wiki:v1:create-page` for the first time can do something no traditional client could: it can read the documentation, reason about what it means, and construct the right request. Not because someone wrote a parser for that specific relation, but because the agent can process natural language and infer intent.

This unlocks the original promise, fifteen years late. The phased disclosure model — start somewhere, see what's available, follow links to learn more — finally works for machines, because the machines can now read.

What does this look like in practice? Consider a HAL+JSON API — a wiki, say — where every response includes hypermedia links:

```json
{
  "_links": {
    "self": { "href": "/pages/abc123" },
    "wiki:v1:edit-page": { "href": "/pages/abc123" },
    "wiki:v1:history": { "href": "/pages/abc123/history" },
    "wiki:v1:delete-page": { "href": "/pages/abc123" }
  },
  "title": "Protocol Design Notes",
  "body": "..."
}
```

The `wiki:` prefix is a CURIE — a compact URI. The API root declares a template that expands it into a documentation URL: `wiki:v1:edit-page` becomes `http://api.example.com/rels/v1:edit-page`, which serves a markdown document explaining the relation. The HTTP method. The input schema. An example request. What the response looks like.

These aren't machine-readable specs. They're *prompt files* — documentation written for an LLM to read and reason about. The distinction matters. A JSON Schema tells a parser exactly what fields are valid. A prompt file tells an agent what the operation *means*, so it can figure out the rest. This is the difference between lookup and inference, and it's the reason the approach works now when it didn't before.

## The headless agentic web

What emerges is something that looks a lot like web browsing — but headless, and operated by agents instead of humans.

An agent starts at a root resource. It sees links. It reads documentation for the ones that look relevant. It follows a link. The response reveals new links it couldn't see before. It reads more documentation, follows more links, goes deeper. It's navigating a hypermedia graph in exactly the way the web was designed to work — except there's no browser, no screen, no human clicking. Just an agent following its nose through an API that progressively discloses its capabilities. Phased disclosure, just like the signage.

The key insight is that this is not a metaphor. The agent is literally browsing. Each API response is a page with links. The relation documentation is the equivalent of a tooltip or help text. The session is a browsing history. The only difference from the human web is that nobody needs to render anything.

This suggests a design principle for the agentic web: **APIs should be built like websites, not like RPC endpoints.** They should have a root you can start from, links you can follow, and documentation you can read at each step. They should reveal their capabilities progressively, not demand complete knowledge upfront.

## Two phases

Progressive disclosure is powerful for exploration but terrible for production. You don't want an LLM reasoning about link relations every time you need to create a wiki page. Inference is expensive, slow, and occasionally wrong. Once you've figured out how to do something, you want to do it the same way every time, without thinking.

This is where the model splits into two distinct phases.

**Phase 1: Exploration.** The agent navigates the API for the first time. It reads relation docs, reasons about methods and input shapes, makes choices about which paths to explore. This is inference-heavy — the agent is building understanding through progressive disclosure. It might take wrong turns. It might backtrack. That's fine. It's learning.

**Phase 2: Distillation.** The exploration is recorded — every request, every response, every link followed — as a directed multigraph. Positions are nodes. Transitions are edges, labeled with the relation, method, and input data. Once the agent has completed a workflow, the graph is traversed to extract the successful path as a **declarative spec**: a sequence of steps with exact relations, methods, and inputs.

```json
{
  "steps": [
    { "action": "start", "url": "/" },
    { "action": "follow", "relation": "wiki:v1:pages", "method": "GET" },
    { "action": "follow", "relation": "wiki:v1:create-page", "method": "POST",
      "input": { "data": { "title": "My Page", "body": "Content" } } }
  ]
}
```

This spec contains no ambiguity. A simple runner reads it and executes each step mechanically. No LLM required. No inference. No reasoning about link relations. The exploration was non-deterministic; the artifact it produced is completely deterministic.

The agent writes the integration so the code doesn't need the agent to run.

## The session graph

The recording mechanism is the bridge between the two phases, and its structure matters. A flat log of requests would lose the topology of the exploration. The session is instead a directed multigraph — positions as nodes, transitions as directed edges — which preserves the branching structure of the agent's exploration.

When the agent follows a link from a page listing to a specific page, that's an edge. When it goes back to the listing and follows a different link, that's a branch. When it creates a page and the response redirects to the new resource, that's a new node. The graph captures not just what the agent did, but the *shape* of the API as the agent experienced it.

This structure enables several things. You can render the graph as a diagram to visualize what was explored. You can use BFS to find the shortest path between any two positions — the most efficient route through the API to accomplish a specific task. You can jump back to any previous position without re-fetching, because the full response is stored at each node.

And critically, you can export any sub-path as an independent, executable spec. The exploration might involve twenty positions and dozens of transitions as the agent pokes around, backtracks, and tries different approaches. The exported path might be three steps. The graph is the raw material; the path spec is the refined product.

## What this means

Three ideas follow from this.

**First: API design is due for a paradigm shift.** If agents are going to be significant API consumers — and they will be — then APIs should be designed for progressive disclosure. This means hypermedia links, discoverable relations, documentation that serves as prompts, and entry points that don't require prior knowledge. The OpenAPI-spec-first model assumes a human intermediary who reads the docs and writes the client. That intermediary is increasingly an agent, and agents don't need a spec — they need a starting point and a way to learn.

**Second: the explore/distill pattern is broadly applicable.** The idea that an agent explores something non-deterministically, records the exploration, and then extracts a deterministic artifact from it is not limited to APIs. It's a general pattern for any domain where discovery requires reasoning but execution should be mechanical. Configuration management, data pipelines, infrastructure provisioning — anywhere humans currently do exploratory work to figure out the right sequence of steps, then codify those steps for repeated execution.

**Third: the web's original architecture was ahead of its time.** Hypermedia, phased disclosure, follow-your-nose navigation — these ideas were designed for a client that could reason about what it found. For years, the only client that could do that was a human with a browser. Machine clients couldn't, so APIs regressed to RPC-style interactions with complete upfront schemas. Now we have machine clients that can reason, and the old architecture turns out to be exactly right. The agentic web doesn't need a new protocol. It needs the protocol we already had, and clients that can finally use it the way it was intended.

When TfL's designers put up signs in the Underground, they trusted that passengers could read, reason, and navigate. They just needed the right information at the right moment. That's all the links were ever meant to be.
