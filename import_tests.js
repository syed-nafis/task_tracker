const fs = require('fs');

const raw = `52	TEST-052	30-Mar-2026	syed.nafis.sadique@gmail.com		web - mobile, web -desk	home page	the front-list "Featured Categories" only has book categories with broken down by different stages of academic level. so title is vague, we can have a better title, that will express the intent of the section/front-list better.	
53	TEST-053	30-Mar-2026	syed.nafis.sadique@gmail.com		web - mobile	super-store page		on add_to_cart button click, change to primary and show text Go to cart will nudge users to goto cart and complete their purchase 
54	TEST-054	07-Apr-2026	syed.nafis.sadique@gmail.com		web - mobile	stationary-pdp	in mobile view you are saving section is hardly noticable	If we increase the font size and potentially the weight of the "You are saving" section on mobile PDPs, then we will see an increase in Add-to-Cart (ATC) rates.
55	TEST-055	07-Apr-2026	syed.nafis.sadique@gmail.com		web -desk	electronics-pdp	we have alot of empty sapce in desktop pdp	If we increase the font size of the percentage discount text (e.g., from 14px to 18px or 20px) to make it more prominent, then we will see an increase in Add-to-Cart (ATC) rates.">
56	TEST-056	07-Apr-2026	syed.nafis.sadique@gmail.com		web -desk	home	the progress-bar copies can be alot stronger	If we change the text to shorter, action-oriented copy (e.g., "Last 1 – Order now!") and change the font color to Red, then we will see a significant increase in Add-to-Cart (ATC) and Conversion Rates.">
57	TEST-057	07-Apr-2026	syed.nafis.sadique@gmail.com		web - mobile	electronics-category-page	product-cards do not show ratings number (i.e 4.5, 4.1)	If we display the exact numerical rating (e.g., 4.2/5) alongside the star icons on product cards, then we will see an increase in Product Detail Page (PDP) click-through rates and overall conversion rates.
58	TEST-058	07-Apr-2026	syed.nafis.sadique@gmail.com		web -desk	quick-deal page	the price the crossed price, and percent off are all similar font size, ther eshould be a visual hierarchy	If we increase the font size of the payable price (and potentially the % off) by 15-20% on product cards, then we will see an increase in Product List CTR and Add-to-Cart (ATC) rates.">
59	TEST-059	07-Apr-2026	syed.nafis.sadique@gmail.com		web - mobile	quick-deal page	Deal section inetnt is the low price, the offer so users ivew the produc-page, when they view hte product page they will 	If we remove the crossed-out original price and only display the payable price and the percentage discount for mobile users, then we will see an increase in Add-to-Cart (ATC) and Conversion Rates."
60	TEST-060	07-Apr-2026	syed.nafis.sadique@gmail.com		web -desk		most users read from left to right. hacing hte payable price to the right mkaes it so the user needs to process more information, and increases their cognitive load over time.	If we move the paying price to the left and the crossed-out original price to the right, then we will see an increase in CTR and Conversion Rate.
61	TEST-061	07-Apr-2026	syed.nafis.sadique@gmail.com		web -desk	sationnary-pdp	for the related product section in dekstop-ui-pdp if the product is in quick deal, it does not show quick deal.	If we display the "Quick Deal" badge (and potentially the % off) on applicable items within the Related Products section, then we will see an increase in Related Product CTR and Cross-sell Conversion Rates.
62	TEST-062	07-Apr-2026	syed.nafis.sadique@gmail.com		web - mobile	electronics-pdp	even though product card shows the stock left amount, pdp does not, this breaks the scarcity that we are trying to induce	showing stock aount left in pdp as well, will continue the scarcity of quick deal from quick-deal / home page to the entire pdp page, will increase atc rate
63	TEST-063		syed.nafis.sadique@gmail.com		web - mobile	cart page	for quick deal items that are low in stock (10 or less) we do not show any urgency sticker or badge, in the cart page	shoing limited stock, or stock running our, badges for quick deal items in cart, will increase checkout rate`;

const lines = raw.trim().split('\n');
const experimentsData = require('./data/experiments.json');
let pagesData = require('./data/pages.json');
let maxId = experimentsData.length > 0 ? Math.max(...experimentsData.map(e => e.id)) : 0;

function parseDate(dStr) {
  if (!dStr) return new Date().toISOString();
  return new Date(dStr).toISOString();
}

for (const line of lines) {
  const parts = line.split('\t');
  
  let idRaw = parts[0];
  let test_id = parts[1];
  let startDateRaw = parts[2];
  let creator = parts[3];
  let platformRaw = parts[5];
  let pageRaw = parts[6] ? parts[6].trim() : '';
  let prob = parts[7] ? parts[7].trim() : '';
  let hyp = parts[8] ? parts[8].trim() : '';
  
  if (!hyp && prob) {
    hyp = prob;
    prob = '';
  }

  hyp = hyp.replace(/">/g, '').replace(/"/g, '');

  let platforms = [];
  if (platformRaw) {
    if (platformRaw.includes('web - mobile')) platforms.push('Web-Mobile');
    if (platformRaw.includes('web -desk')) platforms.push('Web-Desk');
    if (platformRaw.includes('app - ios')) platforms.push('App-iOS');
  }

  let pages = [];
  if (pageRaw) {
    pages.push(pageRaw);
    if (!pagesData.includes(pageRaw)) pagesData.push(pageRaw);
  }

  const titleStr = hyp ? hyp.substring(0, 50) + '...' : 'New Experiment';

  const exp = {
    id: parseInt(idRaw) || ++maxId,
    test_id: test_id || '',
    title: titleStr,
    status: 'Idea',
    platform: platforms,
    pages: pages,
    hypothesis: hyp || '',
    problem_statement: prob || '',
    metrics: { primary: '', secondary: [], guardrail: [] },
    result: 'In Progress',
    revenue_impact: null,
    creator: creator || '',
    baseline_data: prob || '',
    current_data: '',
    start_date: startDateRaw ? parseDate(startDateRaw) : null,
    end_date: null,
    duration_days: null,
    remarks: '',
    growthbook_id: '',
    amaly_task_id: '',
    source: 'self',
    promoted_from_idea_id: null,
    created_at: new Date().toISOString()
  };
  
  experimentsData.push(exp);
}

fs.writeFileSync('./data/experiments.json', JSON.stringify(experimentsData, null, 2));
fs.writeFileSync('./data/pages.json', JSON.stringify(pagesData, null, 2));

console.log('Imported', lines.length, 'experiments');
