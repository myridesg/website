/**
 * The home page FAQ — one array, two consumers.
 *
 * Faq.astro renders the visible accordion from these items, and index.astro
 * passes buildFaqPageEntity(site, '/', FAQ_ITEMS) into BaseLayout's
 * structuredData prop, so the FAQPage schema lands inside the page's single
 * @graph instead of in a second JSON-LD script. Because both come from this
 * one array, the visible text and the schema cannot drift.
 *
 * Feature claims here are kept in step with what the app actually does (see
 * AGENTS.md rule 6): export/share of the bike report is live, import is not,
 * and push reminders are live — renewal reminders follow the ladder in
 * myridesg-v2 apps/mobile/lib/notifications/reminderTriggers.ts.
 */
export interface FaqItem {
  q: string
  a: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Is MyRideSG free to use?',
    a: 'Yes. Core tracking is free, including servicing history, renewal dates, fuel logs and running costs. No payment details are required to create an account. Advanced features may be offered on a paid plan in future, but the everyday tracker — fill-ups, expenses, servicing and reminders — is free today.',
  },
  {
    q: 'Which devices are supported?',
    a: 'MyRideSG is a native app for iOS and Android, downloaded from the App Store or Google Play. There is no web app to sign in to. Setting up your first bike takes about two minutes: the plate, the model and the renewal dates you want tracked.',
  },
  {
    q: 'What is the best app to track motorcycle expenses in Singapore?',
    a: 'There is no single best app for every rider, so it is worth comparing on facts. MyRideSG is a motorcycle app made in Singapore: it logs fuel, servicing and everyday expenses in SGD, works out cost per kilometre and monthly spend, and keeps the records attached to each bike. Core tracking is free, and it is on iOS and Android.',
  },
  {
    q: 'Is there an app for Singapore riders to log fuel consumption?',
    a: 'Yes. MyRideSG is built for this: each fill-up is logged with the date, odometer reading, litres and price, and the app works out fuel consumption in km per litre alongside cost per kilometre. Fill-ups can be priced against listed pump prices, and you can compare pump prices across stations before you top up.',
  },
  {
    q: 'Is there an app to find motorcycle workshops in Singapore?',
    a: 'Yes. MyRideSG includes a workshop directory for Singapore riders: browse by region and speciality, review the services each workshop offers, and call, message or get directions with a tap. MyRideSG does not book appointments for you — the directory helps you compare workshops and make contact yourself.',
  },
  {
    q: 'How do I check when my motorcycle COE expires?',
    a: 'The official record is on OneMotoring, the LTA\u2019s motoring portal: log in with Singpass and look up your vehicle to see its COE expiry date. A motorcycle COE is valid for ten years and is renewed through LTA. Once you know the date, store it in MyRideSG and the app counts down to it and reminds you before it falls due.',
  },
  {
    q: 'How do I keep a digital service record for my motorcycle?',
    a: 'Log each job as it is done — date, mileage, what was serviced and what it cost — and keep the entries in one place. MyRideSG does this per bike: servicing, oil changes and tyres build into a service history you can review in the app and export as a bike report to share with a workshop or a buyer.',
  },
  {
    q: 'What happens to my service history when I sell my motorcycle in Singapore?',
    a: 'Your records stay yours. Export the full service history from MyRideSG as a bike report and pass it to the new owner, so the bike is sold with a documented record of what was serviced, when and at what mileage. Nothing is handed over automatically — you choose what to share.',
  },
  {
    q: 'Can I import existing records from a spreadsheet?',
    a: 'Not yet. CSV import is planned for a future release. In the meantime, records are added manually — a service entry, fill-up or expense takes about two minutes per entry once your bike is set up. Exporting your history is available today.',
  },
  {
    q: 'Can workshops see my data?',
    a: 'No. Your ownership records are private by default, and workshops cannot browse them. A workshop only sees what you choose to share with it — for example a bike report you have exported and shown them. Nothing is visible to anyone else by default.',
  },
  {
    q: 'How does MyRideSG track renewal dates?',
    a: 'You enter your road tax, insurance and COE expiry dates when you add your bike. MyRideSG counts down to each one, sends a push reminder ahead of each expiry, and keeps the dates next to your servicing schedule so everything due is on one screen.',
  },
  {
    q: 'How are road tax renewal reminders worked out?',
    a: 'From the road tax expiry date stored against your bike. Push notifications are scheduled locally and fire at 9am Singapore time 30, 14, 7, 1 and 0 days before expiry, then the day after and a week after in case the renewal has not been recorded. COE and insurance dates follow the same ladder, and reminders falling due the same morning are grouped into one notification.',
  },
]
