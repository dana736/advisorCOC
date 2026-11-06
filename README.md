# Cash Out Formula — GitHub + Netlify deployment

The original HTML/CSS, embedded brand images, and footer are retained. The OpenAI request was moved from browser-side JavaScript to a protected Netlify Function. The advisor now carries conversation history across turns **within an open page session**.

## Deploy
1. Add `index.html` at the **root** of the GitHub repository connected to Netlify.
2. Add `netlify/functions/chat.js` with exactly that folder structure (do not upload just index.html).
3. In Netlify, go to **Project configuration → Environment variables** and create `OPENAI_API_KEY` with your **new** OpenAI API key. Set scope to **Functions** (or all scopes). Never commit the key to GitHub or put it in HTML.
4. Make sure the Netlify site is deploying from this GitHub repository. Trigger a fresh deployment (a new commit normally does this).
5. Test by asking a question and then a follow-up on the deployed site.

**Important:** The older key appeared in the previous HTML. Revoke/rotate that key in your OpenAI account even if you have already removed it from this file.

Model: `gpt-6.1-sol` by default. To change it later, set the optional Netlify environment variable `OPENAI_MODEL` (and redeploy). OpenAI API billing and model access are separate from a ChatGPT subscription.

This uses live OpenAI-generated answers; it does **not** browse the live web or connect to your ChatGPT account or stored chat history. It remembers conversation messages only while the visitor stays on that page. The function endpoint is public; consider adding abuse protection, rate limiting, or access control before broad public launch to control API costs.
