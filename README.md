# DNS-over-HTTPS (DoH) Proxy Worker

A Cloudflare Worker to route DNS-over-HTTPS (DoH) requests through custom servers based on target domain names. This proxy is useful for bypassing DNS restrictions or enhancing DNS performance/security.

## 🌐 Features

- Routes DNS queries using `GET` and `POST` to alternative DoH servers.
- Custom domain-to-DoH server mapping.
- Defaults to Cloudflare DoH if no match found.
- Optimized performance with error-handling and minimal overhead.

---

## 🚀 How to Deploy on Cloudflare

1. Create a new [Cloudflare Worker](https://dash.cloudflare.com).
2. Copy the contents of `worker.js` into the worker editor.
3. Save and deploy the worker.
4. Make sure your worker’s route matches the DNS endpoint, for example:
   ```
   https://your-worker-id.workers.dev/dns-query
   ```

---

## 🧪 How to Use

1. Open your browser or OS DNS settings.
2. Set your DNS server to use DNS-over-HTTPS.
3. Enter the deployed URL like this (example):

```
https://your-worker-id.workers.dev/dns-query
```

Most modern browsers (e.g., Firefox, Chrome) allow entering custom DoH URLs.

---

## 🌍 Persian Instructions | راهنمای فارسی

### 🎯 این پروژه چیست؟

این اسکریپت یک پراکسی DNS-over-HTTPS است که برای کلودفلر ورکر نوشته شده تا بتوانید درخواست‌های DNS را به سرورهای مختلف و مناسب هدایت کنید. برای مثال اگر سایتی مثل `chatgpt.com` را درخواست دهید، درخواست DNS به سرور DoH سرویس Shecan هدایت می‌شود.

---

### ✅ مراحل راه‌اندازی در Cloudflare Worker:

1. وارد حساب Cloudflare شوید و یک Worker جدید بسازید.
2. محتوای فایل `worker.js` را کپی کرده و در بخش Editor پیست کنید.
3. روی Deploy کلیک کنید.
4. آدرس نهایی Worker چیزی شبیه زیر خواهد بود:
   ```
   https://your-worker-id.workers.dev/dns-query
   ```

---

### 🌐 نحوه استفاده در مرورگر یا سیستم عامل

1. وارد تنظیمات DNS مرورگر یا سیستم عامل خود شوید.
2. حالت DoH (DNS over HTTPS) را فعال کنید.
3. آدرس زیر را وارد کنید:
   ```
   https://your-worker-id.workers.dev/dns-query
   ```

🛠 این روش برای دور زدن فیلترینگ یا افزایش امنیت و سرعت DNS مناسب است.

---

## 🔐 Notes

- This worker only responds to requests on `/dns-query` path.
- You can add more domains in the `domainMapping` section.
- Consider protecting the endpoint if privacy is a concern.

---

## 🧑‍💻 Author

Custom DoH Worker created by Amir Mostafa Haji Sadeghian.
