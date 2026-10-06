// Realistic payloads for the /demo page — the same shapes the real webhooks receive.

export const DEMO_SAMPLES = {
  webform: [
    {
      name: "Priya Shah",
      business: "Sunset Sushi",
      phone: "(773) 555-0177",
      email: "priya@sunsetsushi.com",
      address: "2210 W Armitage Ave",
      message: "Our sushi display case won't get below 45 since this morning. We open at 11 — can someone come today?",
    },
    {
      name: "Hector Ruiz",
      business: "Ruiz Family Market",
      phone: "708-555-0102",
      email: "",
      address: "",
      message: "Looking for a quote on a preventive maintenance plan for 3 reach-ins and an ice machine.",
    },
  ],
  email: [
    {
      from: "Dana Wells <dana@lakeshorehotel.com>",
      subject: "Ice machine in the banquet kitchen",
      text: "Hi Denise,\n\nThe Hoshizaki in our banquet kitchen is making about half the ice it should. We have a wedding Saturday so we'd love to get it looked at this week.\n\nDana Wells\nLakeshore Hotel\n(312) 555-0166",
    },
    {
      from: "Growth Team <hello@rankfast.io>",
      subject: "Get 5x more customers this month",
      text: "Hi there! Our SEO package will get your business to rank on Google page 1. 50% off this week only. Reply STOP to unsubscribe.",
    },
  ],
  // FreshMart has an open quote — this reply should land on that job, not create a new one.
  sms: [
    { from: "+13125550177", body: "Hey Denise, Carl at FreshMart. We're good with the $1,250, go ahead. When can your guy come?" },
    { from: "+17735550144", body: "hi this is Joe from Joe's Tacos, got your number from Tony at the diner. our walk in freezer is iced over and not freezing, food is thawing" },
  ],
  call: [
    { from: "+17085550188", transcript: "Hi, this is Mark with Northgate Warehouse. One of our walk-in coolers is alarming at 48 degrees. Please call me back at 708-555-0188." },
    { from: "+13125550120", transcript: "" },
  ],
} as const;

export type DemoKind = keyof typeof DEMO_SAMPLES;

// Sample emails for the Inbox, so the review flow can be tried without connecting a real Gmail.
export const SAMPLE_EMAILS = [
  {
    fromName: "Dana Wells",
    fromEmail: "dana@lakeshorehotel.com",
    subject: "Ice machine in the banquet kitchen",
    text: "Hi Denise,\n\nThe Hoshizaki in our banquet kitchen is making about half the ice it should. We have a wedding Saturday so we'd love to get it looked at this week.\n\nDana Wells\nLakeshore Hotel\n(312) 555-0266",
  },
  {
    fromName: "Marcus Bell",
    fromEmail: "marcus@oakandembersteak.com",
    subject: "Quote for a maintenance plan",
    text: "Hello,\n\nWe're opening a second location next month and want a quarterly maintenance plan for two walk-in coolers and a walk-in freezer. Could you send a quote?\n\nThanks,\nMarcus Bell\nOak & Ember Steakhouse\n773-555-0245",
  },
  {
    fromName: "Linh Tran",
    fromEmail: "linh@saigonkitchen.com",
    subject: "URGENT - freezer down",
    text: "Our walk-in freezer is down since this morning and the temperature is climbing. Product at risk. Please call me asap: 708-555-0238",
  },
  {
    fromName: "Growth Team",
    fromEmail: "hello@rankfast.io",
    subject: "Get 5x more customers this month",
    text: "Hi there! Our SEO package will get your business to rank on Google page 1. 50% off this week only. Reply STOP to unsubscribe.",
  },
] as const;
