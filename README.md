# 🥛 दूध डिलीवरी लाइव ट्रैकर

## कम्प्यूटर पर चलाना (टेस्ट)
1. Node.js इंस्टॉल करें (nodejs.org)
2. इस फोल्डर में टर्मिनल खोलकर चलाएँ:  `ADMIN_PASS=मेरापासवर्ड node server.js`
3. customers का पेज: http://localhost:3000   |   दूधवाले का पेज: http://localhost:3000/admin

## इंटरनेट पर डालना (ताकि मोबाइल से चले)
GPS सिर्फ **https** लिंक पर चलता है, इसलिए इसे किसी hosting पर डालें (जैसे render.com, railway.app):
1. इस फोल्डर को GitHub पर डालें → Render में "New Web Service" बनाएँ
2. Build command: खाली  |  Start command: `node server.js`
3. Environment variable जोड़ें: `ADMIN_PASS` = आपका पासवर्ड
4. जो लिंक मिले (जैसे https://milk.onrender.com) वह customers/मम्मी को भेजें।
   दूधवाला `.../admin` खोले।

## दूधवाला कैसे चलाए
1. `/admin` खोलें → पासवर्ड डालकर सेव करें
2. 🏠 घर सेट करें, फिर हर स्टॉपेज की जगह नक्शे पर टैप करके नाम डालें
3. निकलते समय "📍 लोकेशन ऑन करें" दबाएँ, Allow करें, और पेज खुला रखें

ध्यान दें: मुफ्त hosting पर डेटा restart होने पर मिट सकता है (data.json) — स्टॉपेज फिर जोड़ने पड़ सकते हैं।
