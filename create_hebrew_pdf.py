from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from bidi.algorithm import get_display
import os

# Register Hebrew fonts
pdfmetrics.registerFont(TTFont('NotoHebrew', '/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoHebrewBold', '/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf'))

def heb(text):
    """Apply bidi algorithm for correct Hebrew display."""
    return get_display(text)

doc = SimpleDocTemplate(
    "/home/user/-/תרגום_הוד_ושאיבה.pdf",
    pagesize=A4,
    rightMargin=1.5*cm,
    leftMargin=1.5*cm,
    topMargin=1.5*cm,
    bottomMargin=1.5*cm,
)

W, H = A4

title_style = ParagraphStyle(
    'Title', fontName='NotoHebrewBold', fontSize=14,
    alignment=1, spaceAfter=4, leading=20,
)
subtitle_style = ParagraphStyle(
    'Subtitle', fontName='NotoHebrewBold', fontSize=12,
    alignment=1, spaceAfter=10, leading=18,
)
body_style = ParagraphStyle(
    'Body', fontName='NotoHebrew', fontSize=8,
    alignment=2, leading=13, wordWrap='RTL',
)
bold_style = ParagraphStyle(
    'Bold', fontName='NotoHebrewBold', fontSize=8,
    alignment=2, leading=13,
)
cell_style = ParagraphStyle(
    'Cell', fontName='NotoHebrew', fontSize=8,
    alignment=1, leading=13,
)

elements = []

# Title
elements.append(Paragraph(heb("מסעדת אל-ח'אן / בלדי מול"), title_style))
elements.append(Paragraph(heb("כתב כמויות עבודות הודים ושאיבה"), subtitle_style))
elements.append(Spacer(1, 0.3*cm))

# --- Header row ---
header = [
    Paragraph(heb("סה\"כ (ש\"ח)"), bold_style),
    Paragraph(heb("מחיר יחידה (ש\"ח)"), bold_style),
    Paragraph(heb("כמות"), bold_style),
    Paragraph(heb("יחידה"), bold_style),
    Paragraph(heb("תיאור העבודה"), bold_style),
    Paragraph(heb("סעיף"), bold_style),
]

# --- Item 1 description ---
item1_desc = heb(
    "אספקה והתקנת הוד מטבח מנירוסטה איכותי לשאיבת אדים, שומנים ושמנים, מיוצר מפלדת Stainless Steel "
    "עמידה בפני חלודה, בעובי מתאים, עמיד בפני שחיקה וקל לניקוי, בעיצוב ומידות בהתאם לתוכניות ודרישות האתר. "
    "ההוד כולל פילטרי שומן מסוג Baffle Filters הניתנים לפירוק וניקוי, תעלות/מגשי איסוף שומן עם נקודות ניקוז, "
    "תאורה מובנית מוגנת ומתאימה לשימוש במטבחות, וכל החיזוקים הפנימיים, תמיכות, קורות ואמצעי ההידוק הנדרשים. "
    "כולל כל החיבורים, החלקים והאביזרים הנדרשים להשלמת העבודה כיאות, לרבות קצוות, חיבורים, פלנג'ים, ברגים, "
    "סיליקון/חומרי אטימה, וכל עבודות החיתוך, ההידוק והגימור הנדרשות. הביצוע יהיה מלא בהתאם לתוכניות "
    "ומפרטים הטכניים והנחיות המהנדס, כולל אספקה, התקנה וחיבור מלא מוכן להפעלה."
)

# --- Item 2 description ---
item2_desc = heb(
    "אספקה והתקנת תעלות אוויר מפלדה צבועה בשחור (Black Steel) עובי 2 מ\"מ, ריתוך מלא, "
    "מיועדות לשאיבת אדי מטבח, כולל כל החלקים המיוחדים (מרפקים, חיבורים, T-ים), בסיסים ותמיכות הידוק, "
    "ופתחי ניקוי (Access Doors), בהתאם לתוכניות ומפרטים."
)

# --- Item 3 description ---
item3_desc = heb(
    "פירוק מאוורר שאיבה קיים ממיקומו הנוכחי, העברתו למיקום החדש בהתאם לתוכניות העיצוב המאושרות, "
    "והרכבתו מחדש והפעלתו, כולל פירוק והרכבה מחדש של כל החיבורים המכניים והחשמליים "
    "(בסיסי הידוק, חיבורים גמישים, פלנג'ים, ברגים, כבלים, לוח בקרה אם קיים), "
    "וחיבורו מחדש עם תעלות האוויר הקיימות או החדשות, תוך ביצוע כל הבדיקות הנדרשות."
)

# --- Item 4 description ---
item4_desc = heb(
    "אספקה, התקנה והפעלת מאוורר צנטריפוגלי (Centrifugal Fan) מתאים להתקנה על הגג מהסוג המיוחד "
    "העמיד בטמפרטורות גבוהות, בעוצמה 2200 ליטר/שניה ו-2 אינץ' לחץ סטטי בהתאם לתוכניות, "
    "מיוצר מחומרים עמידים לתנאי מזג אוויר, מצויד במנוע חשמלי יעיל, כולל בסיס מתכת (Steel Base Frame) "
    "עם בסיסים מונעי רטט (Anti-Vibration Mounts), חיבור גמיש (Flexible Connection), "
    "וחיבור מלא עם תעלות האוויר (דאקט), עם כל האביזרים הנדרשים."
)

def p(text, style=body_style):
    return Paragraph(text, style)

def pb(text):
    return Paragraph(text, bold_style)

def pc(text):
    return Paragraph(text, cell_style)

# Columns widths (right to left in visual order):
# סעיף | תיאור | יחידה | כמות | מחיר יחידה | סה"כ
col_widths = [1.2*cm, 9.5*cm, 1.5*cm, 1.4*cm, 2.4*cm, 2.4*cm]

data = [
    header,
    # Section 1 title
    ['', pb(heb("הודים")), '', '', '', pb(heb("1"))],
    # Item 1 description
    ['', p(item1_desc), '', '', '', ''],
    # Sub-item 1.1
    [pc('16,900'), pc('16,900'), pc('1'), p(heb("יח'")), p(heb(r"מידה 6 מטר אורך * 1.0 מטר רוחב")), pc(heb('1.1'))],
    # Sub-item 1.2
    [pc('6,600'), pc('6,600'), pc('1'), p(heb("יח'")), p(heb(r"מידה 2 מטר אורך * 0.9 מטר רוחב")), pc(heb('1.2'))],
    # Section 2
    ['', pb(heb("ארובת ברזל שחור")), '', '', '', pb(heb("2"))],
    [pc('29,820'), pc('420'), pc('71'), p(heb('מ"ר')), p(item2_desc), ''],
    # Section 3
    ['', pb(heb("פירוק, העברה והרכבה מחדש של מאוורר קיים (Existing Fan)")), '', '', '', pb(heb("3"))],
    [pc('3,000'), pc('3,000'), pc('1'), p(heb("יח'")), p(item3_desc), ''],
    # Section 4
    ['', pb(heb("אספקה, התקנה והפעלת מאוורר צנטריפוגלי גגי (Roof Mounted Centrifugal Fan)")), '', '', '', pb(heb("4"))],
    [pc('7,500'), pc('7,500'), pc('1'), p(heb("יח'")), p(item4_desc), ''],
]

table = Table(data, colWidths=col_widths, repeatRows=1)

table.setStyle(TableStyle([
    # Overall grid
    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    # Header background
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E4057')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    # Section title rows background
    ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#C8D8E8')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#C8D8E8')),
    ('BACKGROUND', (0, 7), (-1, 7), colors.HexColor('#C8D8E8')),
    ('BACKGROUND', (0, 9), (-1, 9), colors.HexColor('#C8D8E8')),
    # Section titles span
    ('SPAN', (0, 1), (4, 1)),
    ('SPAN', (0, 2), (4, 2)),
    ('SPAN', (0, 5), (4, 5)),
    ('SPAN', (0, 7), (4, 7)),
    ('SPAN', (0, 9), (4, 9)),
    # Alternating row colors for data rows
    ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 4), (-1, 4), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 8), (-1, 8), colors.white),
    ('BACKGROUND', (0, 10), (-1, 10), colors.HexColor('#F5F5F5')),
    # Padding
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]
))

elements.append(table)
elements.append(Spacer(1, 0.5*cm))

# Summary table
summary_data = [
    [pc('63,820'), pb(heb('סה"כ לביצוע עבודות (ש"ח)'))],
    [pc('2,000'), p(heb('עבודות תכנון (נכלל חלקית)'))],
    [pc('0'), p(heb('עבודות פיקוח (נכלל במלואו)'))],
    [pc('65,820'), pb(heb('סכום כולל (ש"ח)'))],
]
summary_table = Table(summary_data, colWidths=[3*cm, 8*cm])
summary_table.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E8F0E8')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#2E4057')),
    ('TEXTCOLOR', (0, 3), (-1, 3), colors.white),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
]))

elements.append(summary_table)

doc.build(elements)
print("PDF created successfully!")
