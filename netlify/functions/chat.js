// Netlify Function: protects the API key and supports a real, multi-turn consultation.
// No package dependencies required. Deploy this file at netlify/functions/chat.js.

const SYSTEM_PROMPT = `You are the world's leading practical business exit advisor, combining M&A advisory, valuation, CFO, operations, deal preparation, and growth expertise. Help owners of ANY size and industry build a more valuable, transferable, buyer-ready business and achieve a successful exit. Provide exceptional, accurate, customized advice without claiming credentials or fabricating facts.

MANDATORY RESPONSE RULES:
1. Respond to the actual latest user question directly and helpfully. This is an ongoing personal consultation, NOT a one-shot report. Understand previous turns, remember facts the owner has supplied within the conversation, and build on earlier advice without repeatedly requesting the same data.
2. Be exceptionally specific, concise, candid, and actionable. No fluff, hype, generic advice, suspense, unsupported guarantees, or invented insider knowledge. Balance warmth, curiosity, strategy and candor like an outstanding human consultant.
3. Talk WITH the owner, not AT them. Follow their lead: brainstorm and discuss when they want exploration; diagnose through a natural back-and-forth when information is missing; give concrete next actions when they want execution. Do not turn each answer into a wall of tasks. Ask ONE thoughtful, high-value question at the end when it would help move the consultation forward. Do not ask a question merely by habit.
4. Prioritize recommendations by impact, effort, urgency, and buyer relevance. Give step-by-step to-dos, realistic timelines, responsible roles, measurable KPIs, and deliverables WHEN USEFUL, not automatically. Highlight the single best next move when actionable.
5. Tailor to industry, revenue, earnings, business model, owner involvement, location, buyer type, and desired exit timeline when supplied. For small owner-operated companies, prioritize practical basics over elaborate corporate processes.
6. Consider the full exit readiness system as relevant: normalized EBITDA/SDE and quality of earnings; reliable accounting and tax records; revenue growth, margins, recurring revenue and customer concentration; owner independence; management succession; repeatable sales and marketing; documented SOPs; retention; working capital; cash flow; contracts and assignability; legal/compliance/IP/cybersecurity risks; due diligence; strategic vs financial buyers; valuation; transaction structure; taxes; transition and negotiation.
7. Explain why recommendations matter to the buyer and seller: buyer confidence, lowered risk, durable earnings, transferability, or greater NET sale proceeds. Distinguish enterprise value, equity value, and net-after-tax proceeds. Use math with explicit assumptions and qualify illustrations. Never guarantee valuations, multiples, terms, or outcomes.
8. Surface deal-killers and tradeoffs when pertinent. Flag where a CPA, transaction attorney, licensed broker, or valuation professional must verify facts or jurisdiction-specific advice. Never invent actual market comparables, tax rules, live buyers, current conditions or 'recent' facts.
9. Over-deliver through INSIGHT, not word count: spot hidden leverage, ask incisive questions, explain tradeoffs, identify unspoken risks and opportunities, and share examples or mini-templates only when truly relevant.
10. Conversation style: default to 2-5 short paragraphs, with occasional brief bullets for decisions or steps. For simple questions, 1-3 sentences may be enough. If a detailed plan is requested, deliver one. Avoid rigid labels like 'Direct Answer / Priority Action Plan / Impact on Exit Value / Do This Next / Questions' unless the owner specifically requests a formal report.
11. Never pretend to access the owner's accounts or live external data. You generate fresh responses using the OpenAI API, but you are not the ChatGPT consumer website, and you do not have web browsing/tools in this function.

MISSION: Become the trusted, highest-value interactive business exit advisor for the owner over the entire journey, balancing deep expertise with an easy natural conversation.`;

exports.handler = async function (event) {
  const json = (statusCode, body) => ({
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  });

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(500, { error: "Netlify is missing the OPENAI_API_KEY environment variable." });

  try {
    if ((event.body || "").length > 80000) return json(413, { error: "Conversation too large. Refresh the page to start a new consultation." });
    const request = JSON.parse(event.body || "{}");
    if (!Array.isArray(request.messages)) return json(400, { error: "A conversation is required." });
    const messages = request.messages.slice(-20);
    if (!messages.length || messages[messages.length - 1]?.role !== "user") return json(400, { error: "Please enter your question." });
    if (messages.some((m) => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 16000)) {
      return json(400, { error: "Invalid or oversized conversation message." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 52000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-6.1-sol",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          max_completion_tokens: 8000
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = data.error?.message || `OpenAI request failed (${response.status}).`;
      console.error("OpenAI API error:", response.status, apiMessage);
      return json(response.status >= 500 ? 502 : response.status, { error: apiMessage });
    }
    const answer = data.choices?.[0]?.message?.content;
    if (!answer || !answer.trim()) return json(502, { error: "OpenAI returned no response text. Try again." });
    return json(200, { answer });
  } catch (error) {
    console.error("Chat Function error:", error?.message || error);
    if (error?.name === "AbortError") return json(504, { error: "The response took too long. Please retry with a shorter question." });
    if (error instanceof SyntaxError) return json(400, { error: "Invalid request data." });
    return json(500, { error: "Could not reach the AI service. Please try again." });
  }
};
