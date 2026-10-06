import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h1>404</h1>
          <p>صفحه پیدا نشد</p>
          <Link href="/fa">بازگشت به خانه</Link>
        </main>
      </body>
    </html>
  );
}
