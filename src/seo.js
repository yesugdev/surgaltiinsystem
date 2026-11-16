// SEO: зөвхөн нүүр хуудас (нэвтрэх) Google-д харагдана. Бусад бүх хуудас нэвтрэлт шаарддаг тул noindex.
const express = require('express');

const SITE_URL = (process.env.SITE_URL || 'https://learn.yesuvd.tech').replace(/\/+$/, '');
const SITE_NAME = 'YeSuvd';
const DESCRIPTION =
  'YeSuvd — багш, сурагчдад зориулсан онлайн сургалтын систем: онлайн шалгалт ба автомат дүгнэлт, хичээл, даалгавар, тест, програмчлалын бодлого, алгоритмын визуализаци, дүнгийн Excel анализ.';

// Индексжүүлэхгүй хэсгүүд (бүгд нэвтрэлт шаарддаг)
const PRIVATE = ['/admin', '/exams', '/student', '/lessons', '/learn', '/files', '/cp', '/basics', '/viz', '/coding', '/logout'];

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  const lines = ['User-agent: *', 'Allow: /$', ...PRIVATE.map((p) => 'Disallow: ' + p), '', 'Sitemap: ' + SITE_URL + '/sitemap.xml', ''];
  res.type('text/plain').send(lines.join('\n'));
});

router.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url><loc>' + SITE_URL + '/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n' +
      '</urlset>\n',
  );
});

/** Нүүр хуудасны SEO мэдээлэл (header.ejs-д seo гэж дамжуулна) */
function homeSeo() {
  return {
    index: true,
    title: SITE_NAME + ' — Онлайн сургалт, шалгалтын систем',
    description: DESCRIPTION,
    canonical: SITE_URL + '/',
    image: SITE_URL + '/img/yesuvd-logo-720.png',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/', inLanguage: 'mn', description: DESCRIPTION },
        { '@type': 'EducationalOrganization', name: SITE_NAME, url: SITE_URL + '/', logo: SITE_URL + '/img/yesuvd-mark.png' },
      ],
    },
  };
}

module.exports = { router, homeSeo, SITE_URL, SITE_NAME };
