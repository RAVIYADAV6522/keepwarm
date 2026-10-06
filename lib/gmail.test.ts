import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, htmlToText, parseFrom, parseMessage, stripQuoted } from "./gmail";

const b64 = (s: string) => Buffer.from(s).toString("base64url");

describe("parseMessage", () => {
  it("reads headers and prefers the plain-text part of a multipart email", () => {
    const m = parseMessage({
      id: "abc",
      internalDate: "1791300000000",
      payload: {
        mimeType: "multipart/alternative",
        headers: [
          { name: "From", value: '"Maya Chen" <Maya@GreenLeafBistro.com>' },
          { name: "Subject", value: "Walk-in cooler warm" },
        ],
        parts: [
          { mimeType: "text/plain", body: { data: b64("Our walk-in is at 45. Can someone come this week?\n(773) 555-0118") } },
          { mimeType: "text/html", body: { data: b64("<p>ignored</p>") } },
        ],
      },
    });
    expect(m).toMatchObject({ id: "abc", fromName: "Maya Chen", fromEmail: "maya@greenleafbistro.com", subject: "Walk-in cooler warm" });
    expect(m.text).toBe("Our walk-in is at 45. Can someone come this week?\n(773) 555-0118");
    expect(m.receivedAt).toEqual(new Date(1791300000000));
  });

  it("flags newsletters and calendar invites", () => {
    const news = parseMessage({ id: "n", payload: { mimeType: "text/plain", headers: [{ name: "List-Unsubscribe", value: "<mailto:x@y.com>" }], body: { data: b64("hi") } } });
    const invite = parseMessage({ id: "i", payload: { mimeType: "multipart/mixed", headers: [{ name: "Subject", value: "Updated invitation: Demo" }], parts: [{ mimeType: "text/calendar" }] } });
    const normal = parseMessage({ id: "p", payload: { mimeType: "text/plain", headers: [{ name: "Subject", value: "Freezer down" }], body: { data: b64("help") } } });
    expect([news.bulk, invite.calendar, normal.bulk, normal.calendar]).toEqual([true, true, false, false]);
  });

  it("falls back to HTML when there is no plain text", () => {
    const m = parseMessage({ id: "x", payload: { mimeType: "text/html", headers: [], body: { data: b64("<div>Freezer down!<br>Call 312-555-0142</div><style>p{}</style>") } } });
    expect(m.text).toBe("Freezer down!\nCall 312-555-0142");
  });
});

describe("helpers", () => {
  it("parses bare and named From headers", () => {
    expect(parseFrom("tony@tonysdiner.com")).toEqual({ name: null, email: "tony@tonysdiner.com" });
    expect(parseFrom("Tony Russo <tony@tonysdiner.com>")).toEqual({ name: "Tony Russo", email: "tony@tonysdiner.com" });
  });

  it("drops the quoted thread under a reply", () => {
    expect(stripQuoted("Yes go ahead.\n\nOn Mon, Oct 5, 2026 at 9:00 AM Denise <d@x.com> wrote:\n> Here is your quote")).toBe("Yes go ahead.");
  });

  it("decodes entities in HTML", () => {
    expect(htmlToText("Tom &amp; Jerry&#39;s &lt;Deli&gt;")).toBe("Tom & Jerry's <Deli>");
  });

  it("encrypts the refresh token so the database alone can't read it", async () => {
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    const stored = await encryptToken("1//refresh-token");
    expect(stored).not.toContain("refresh-token");
    expect(await decryptToken(stored)).toBe("1//refresh-token");
  });
});
