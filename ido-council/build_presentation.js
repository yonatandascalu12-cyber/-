const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require("/root/.claude/skills/synced/d7ef2833-bcec-4610-932b-ae4b32ffdd8b_10004059-261d-4766-bfc2-b4fea29e911a/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";

const HEX = {
  purple: "4B2A8C", lilac: "EFE9FF", white: "FFFFFF", ink: "2B2140",
  yellow: "FFC93C", orange: "FF7A3D", pink: "FF5C8A", teal: "1FB5A8", blue: "3A86FF", green: "6BCB3C",
};
const THEME = {
  name: "Ido Council",
  headFontFace: "Arial",
  bodyFontFace: "Arial",
  colors: {
    dk1: HEX.ink, lt1: HEX.white, dk2: HEX.purple, lt2: HEX.lilac,
    accent1: HEX.yellow, accent2: HEX.orange, accent3: HEX.pink,
    accent4: HEX.teal, accent5: HEX.blue, accent6: HEX.green,
    hlink: HEX.blue, folHlink: HEX.purple,
  },
};

async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const RTL = { rtlMode: true, lang: "he-IL", align: "right" };

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9"; // 10 x 5.625
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = "עידו למועצת התלמידים";
  pres.author = "עידו";
  const C = pres.SchemeColor;

  pres.defineSlideMaster({
    title: "Title Dark",
    background: { color: C.text2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 4.3, y: 1.2, w: 5.2, h: 1.6, fontSize: 48, bold: true, color: C.background1, align: "right", valign: "bottom", rtlMode: true, lang: "he-IL" }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 4.3, y: 2.9, w: 5.2, h: 1.2, fontSize: 24, color: C.accent1, align: "right", valign: "top", rtlMode: true, lang: "he-IL" }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "Title Only",
    background: { color: C.background2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.35, w: 9, h: 0.85, fontSize: 38, bold: true, color: C.text2, align: "right", valign: "middle", rtlMode: true, lang: "he-IL" }, text: "" } },
    ],
    slideNumber: { x: 0.3, y: 5.15, w: 0.5, h: 0.3, fontSize: 11, color: C.text2 },
  });

  const shadow = () => ({ type: "outer", color: "000000", opacity: 0.15, blur: 6, offset: 2, angle: 90 });
  const T = (s, text, o) => s.addText(text, { isTextBox: true, fontFace: "Arial", ...RTL, ...o });

  // Funny line bubble used on several slides
  const joke = (s, text, color) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.3, w: 9, h: 0.75, rectRadius: 0.2, fill: { color }, objectName: "joke-bubble" });
    T(s, text, { x: 0.7, y: 4.3, w: 8.6, h: 0.75, fontSize: 18, bold: true, italic: true, color: C.background1, valign: "middle", objectName: "joke-text" });
  };

  // Rows: colored icon circle on the right, text to its left (RTL)
  const rows = async (s, items, color) => {
    for (let i = 0; i < items.length; i++) {
      const y = 1.45 + i * 0.9;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.2, y, w: 6.3, h: 0.72, rectRadius: 0.15, fill: { color: C.background1 }, shadow: shadow(), objectName: `row-${i}` });
      s.addShape(pres.shapes.OVAL, { x: 8.75, y: y + 0.11, w: 0.5, h: 0.5, fill: { color }, objectName: `row-dot-${i}` });
      s.addImage({ data: await icon(items[i][0], HEX.white), x: 8.87, y: y + 0.23, w: 0.26, h: 0.26, objectName: `row-icon-${i}` });
      T(s, items[i][1], { x: 3.35, y, w: 5.3, h: 0.72, fontSize: 20, color: C.text1, valign: "middle" });
    }
  };
  const bigIcon = async (s, Comp, color) => {
    s.addShape(pres.shapes.OVAL, { x: 0.6, y: 1.5, w: 2.2, h: 2.2, fill: { color }, shadow: shadow(), objectName: "big-icon-circle" });
    s.addImage({ data: await icon(Comp, HEX.white), x: 1.1, y: 2.0, w: 1.2, h: 1.2, objectName: "big-icon" });
  };

  // 1. Title
  pres.addSection({ title: "פתיחה" });
  let s = pres.addSlide({ masterName: "Title Dark", sectionTitle: "פתיחה" });
  s.addText("עידו למועצת התלמידים!", { placeholder: "title" });
  s.addText("כיתה ג׳ · כי ביחד זה יותר כיף", { placeholder: "body" });
  // Photo placeholder (replace with Ido's photo)
  s.addShape(pres.shapes.OVAL, { x: 0.8, y: 0.9, w: 3.2, h: 3.2, fill: { color: C.accent1 }, objectName: "photo-ring" });
  s.addShape(pres.shapes.OVAL, { x: 0.95, y: 1.05, w: 2.9, h: 2.9, fill: { color: C.background1 }, objectName: "photo-placeholder" });
  T(s, "כאן תבוא התמונה של עידו", { x: 1.1, y: 2.05, w: 2.6, h: 0.9, fontSize: 16, color: C.text2, align: "center" });
  s.addImage({ data: await icon(fa.FaStar, HEX.yellow), x: 8.9, y: 0.4, w: 0.6, h: 0.6, objectName: "star-1" });
  s.addImage({ data: await icon(fa.FaStar, HEX.pink), x: 4.5, y: 4.4, w: 0.45, h: 0.45, objectName: "star-2" });
  s.addImage({ data: await icon(fa.FaStar, HEX.teal), x: 3.7, y: 0.5, w: 0.35, h: 0.35, objectName: "star-3" });
  s.addNotes("שלום לכולם! קוראים לי עידו, ואני רוצה להיות נציג הכיתה במועצת התלמידים. יש לי 5 רעיונות שיעשו לנו את בית הספר הכי כיפי שיש!");

  // 2. Five promises
  pres.addSection({ title: "ההבטחות שלי" });
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "ההבטחות שלי" });
  s.addText("5 הבטחות שלי אליכם", { placeholder: "title" });
  const promises = [
    [fa.FaFutbol, "משחקים בהפסקה", HEX.orange],
    [fa.FaLightbulb, "קופסת רעיונות", HEX.yellow],
    [fa.FaHandsHelping, "חברות בלי חרמות", HEX.pink],
    [fa.FaGlassCheers, "ימי כיף", HEX.teal],
    [fa.FaTrophy, "תחרויות בין הכיתות", HEX.blue],
  ];
  for (let i = 0; i < promises.length; i++) {
    const x = 8.0 - i * 1.85; // right to left
    s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: 1.45, w: 1.3, h: 1.3, fill: { color: promises[i][2] }, shadow: shadow(), objectName: `promise-circle-${i}` });
    s.addImage({ data: await icon(promises[i][0], HEX.white), x: x + 0.43, y: 1.78, w: 0.64, h: 0.64, objectName: `promise-icon-${i}` });
    T(s, promises[i][1], { x: x - 0.1, y: 2.9, w: 1.7, h: 0.9, fontSize: 17, bold: true, color: C.text1, align: "center", valign: "top" });
  }
  joke(s, "הבטחת בונוס: אני מבטיח לא לשכוח אף הבטחה!", C.text2);
  s.addNotes("אלה חמשת הדברים שאני מבטיח לעשות. בואו נעבור עליהם אחד-אחד.");

  // 3. Recess games
  pres.addSection({ title: "הרעיונות" });
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "הרעיונות" });
  s.addText("משחקים בהפסקה", { placeholder: "title" });
  await bigIcon(s, fa.FaFutbol, HEX.orange);
  await rows(s, [
    [fa.FaBoxOpen, "ארגז משחקים לכל כיתה: כדורים וחבלים"],
    [fa.FaRunning, "משחקי חצר: מחניים, תופסת וקלאס"],
    [fa.FaChessKnight, "פינה שקטה עם משחקי קופסה"],
  ], HEX.orange);
  joke(s, "ההפסקה תהיה כל כך כיפית, שהצלצול יתבייש לצלצל!", C.accent2);
  s.addNotes("אני רוצה שבכל הפסקה יהיה מה לעשות – גם למי שאוהב לרוץ וגם למי שאוהב לשבת ולשחק.");

  // 4. Idea box – 3-step flow, right to left
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "הרעיונות" });
  s.addText("קופסת רעיונות", { placeholder: "title" });
  const steps = [
    [fa.FaPencilAlt, "1. כותבים רעיון על פתק"],
    [fa.FaInbox, "2. שמים בקופסה בכיתה"],
    [fa.FaCheckCircle, "3. כל שבוע בוחרים רעיון ועושים אותו!"],
  ];
  for (let i = 0; i < steps.length; i++) {
    const x = 6.75 - i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.45, w: 2.65, h: 2.55, rectRadius: 0.2, fill: { color: C.background1 }, shadow: shadow(), objectName: `step-card-${i}` });
    s.addShape(pres.shapes.OVAL, { x: x + 0.87, y: 1.65, w: 0.9, h: 0.9, fill: { color: C.accent1 }, objectName: `step-circle-${i}` });
    s.addImage({ data: await icon(steps[i][0], HEX.purple), x: x + 1.09, y: 1.87, w: 0.46, h: 0.46, objectName: `step-icon-${i}` });
    T(s, steps[i][1], { x: x + 0.15, y: 2.7, w: 2.35, h: 1.15, fontSize: 18, bold: true, color: C.text1, align: "center", valign: "top" });
    if (i < steps.length - 1) {
      s.addImage({ data: await icon(fa.FaArrowLeft, HEX.orange), x: x - 0.38, y: 2.55, w: 0.3, h: 0.3, objectName: `step-arrow-${i}` });
    }
  }
  joke(s, "כל רעיון מתקבל! (חוץ מ״לבטל שיעורי בית״... נבדוק את זה)", C.text2);
  s.addNotes("לכל אחד יש רעיונות טובים. בקופסת הרעיונות כולם יכולים להשמיע את הקול שלהם.");

  // 5. Friendship
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "הרעיונות" });
  s.addText("חברות בלי חרמות", { placeholder: "title" });
  await bigIcon(s, fa.FaHeart, HEX.pink);
  await rows(s, [
    [fa.FaUsers, "כולם משחקים עם כולם"],
    [fa.FaUserPlus, "רואים מישהו לבד? מזמינים אותו!"],
    [fa.FaHandshake, "\"שגרירי חברות\" שעוזרים להשלים"],
  ], HEX.pink);
  joke(s, "אצלנו אף אחד לא נשאר לבד – אפילו לא הכריך עם הטונה!", C.accent3);
  s.addNotes("הכי חשוב לי שכולם ירגישו טוב בכיתה. חרם זה לא בשבילנו.");

  // 6. Fun days – 3 cards
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "הרעיונות" });
  s.addText("ימי כיף ופעילויות", { placeholder: "title" });
  const fun = [
    [fa.FaBed, "יום פיג׳מות", "באים לבית הספר בפיג׳מה!", HEX.teal],
    [fa.FaSyncAlt, "יום הפוך", "חולצה הפוכה, כובע הפוך – הכל הפוך!", HEX.orange],
    [fa.FaTree, "פיקניק בחצר", "אוכלים, משחקים ונהנים יחד", HEX.green],
  ];
  for (let i = 0; i < fun.length; i++) {
    const x = 6.75 - i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.45, w: 2.65, h: 3.5, rectRadius: 0.2, fill: { color: fun[i][3] }, shadow: shadow(), objectName: `fun-card-${i}` });
    s.addImage({ data: await icon(fun[i][0], HEX.white), x: x + 0.87, y: 1.75, w: 0.9, h: 0.9, objectName: `fun-icon-${i}` });
    T(s, fun[i][1], { x: x + 0.15, y: 2.85, w: 2.35, h: 0.6, fontSize: 24, bold: true, color: C.background1, align: "center" });
    T(s, fun[i][2], { x: x + 0.15, y: 3.5, w: 2.35, h: 1.2, fontSize: 16, color: C.background1, align: "center", valign: "top" });
  }
  s.addNotes("פעם בחודש יהיה לנו יום מיוחד. אפשר גם להציע ימי כיף חדשים בקופסת הרעיונות!");

  // 7. Class competitions – podium
  s = pres.addSlide({ masterName: "Title Only", sectionTitle: "הרעיונות" });
  s.addText("תחרויות בין הכיתות", { placeholder: "title" });
  const podium = [ // [x, height, place, label, color]
    [3.85, 2.2, "1", "ליגת מחניים", HEX.yellow],
    [6.35, 1.6, "2", "הכיתה הכי נקייה", HEX.blue],
    [1.35, 1.2, "3", "חידון ידע", HEX.pink],
  ];
  const base = 4.9;
  for (const [x, h, place, label, color] of podium) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: base - h, w: 2.3, h, rectRadius: 0.12, fill: { color }, objectName: `podium-${place}` });
    T(s, place, { x, y: base - h + 0.05, w: 2.3, h: 0.7, fontSize: 36, bold: true, color: C.background1, align: "center" });
    T(s, label, { x: x - 0.1, y: base - h - 0.6, w: 2.5, h: 0.5, fontSize: 18, bold: true, color: C.text1, align: "center" });
  }
  s.addImage({ data: await icon(fa.FaTrophy, HEX.yellow), x: 4.65, y: 1.2, w: 0.7, h: 0.7, objectName: "trophy" });
  s.addNotes("הכיתה המנצחת תקבל גביע שעובר מכיתה לכיתה. המטרה היא לנצח – אבל בעיקר ליהנות!");

  // 8. Closing
  pres.addSection({ title: "סיום" });
  s = pres.addSlide({ masterName: "Title Dark", sectionTitle: "סיום" });
  s.addText("תצביעו לעידו!", { placeholder: "title" });
  s.addText([{ text: "עידו – כי ביחד זה יותר כיף", options: { breakLine: true } }, { text: "תודה רבה!" }], { placeholder: "body" });
  s.addShape(pres.shapes.OVAL, { x: 1.0, y: 1.0, w: 2.9, h: 2.9, fill: { color: C.accent1 }, objectName: "vote-circle" });
  s.addImage({ data: await icon(fa.FaVoteYea, HEX.purple), x: 1.75, y: 1.75, w: 1.4, h: 1.4, objectName: "vote-icon" });
  s.addImage({ data: await icon(fa.FaStar, HEX.pink), x: 8.9, y: 0.4, w: 0.55, h: 0.55, objectName: "star-4" });
  s.addImage({ data: await icon(fa.FaStar, HEX.teal), x: 4.4, y: 4.5, w: 0.4, h: 0.4, objectName: "star-5" });
  s.addNotes("אז בבחירות – תצביעו לעידו! תודה רבה שהקשבתם.");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
