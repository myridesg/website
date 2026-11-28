# Tracking plan

What the site tells PostHog, and when. If it is not in this table, the site does not send it.

| Event | Sent when | Properties |
|---|---|---|
| `$pageview` (automatic) | Any page loads | built in |
| `store_button_clicked` | A tap on a link that goes to the App Store, TestFlight or Google Play | `store`: `ios` \| `android`; `location`: `header` \| `footer` \| `hero` \| `finale` \| `guide` \| `get` \| `page` |
| `guide_finished` | The end of a guide's text scrolls into view, once per page view | `slug` |

## Rules

- **Naming:** events are lowercase words joined by underscores, an object then what happened, such as `store_button_clicked`.
- **Autocapture is off.** Only the events above are sent.
- **Every event carries `platform: 'web'`**, so web events can be told apart from the app's.

## Adding an event

1. Write down the question it answers. If there is no question, do not add it.
2. Add a row to the table above.
3. Add the dashboard tile that shows the answer.
4. If it records something new about visitors, update "On our website" in Section 5 of `src/pages/privacy.astro`, and have it reviewed.
5. Only then write the code that sends it.

## Known gaps

- A phone that scans the QR code lands on `/get/` and is redirected before any event can be sent, so QR scans are not counted.
- On a guide short enough that its end is on screen when it opens, `guide_finished` is sent at once.
