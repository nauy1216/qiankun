module.exports = {
  title: 'qiankun',
  base: '/qiankun/',
  locales: {
    '/': {
      lang: 'en-US',
      description: 'Probably the most complete micro-frontends solution you ever met🧐',
    },
    '/zh/': {
      lang: 'zh-CN',
      description: '可能是你见过最完善的微前端解决方案🧐',
    },
  },
  themeConfig: {
    repo: 'umijs/qiankun',
    lastUpdated: 'Last Updated',
    editLinks: true,
    docsDir: 'docs',
    smoothScroll: true,
    locales: {
      '/': {
        selectText: 'Languages',
        label: 'English',
        editLinkText: 'Edit this page on GitHub',
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'API', link: '/api/' },
          { text: 'FAQ', link: '/faq/' },
          { text: 'Changelog', link: 'https://github.com/umijs/qiankun/releases' },
        ],
        sidebar: {
          '/guide/': [
            {
              title: 'Guide',
              collapsable: false,
              children: ['', 'getting-started'],
            },
          ],
          '/api/': [''],
          '/faq/': [''],
        },
      },
      '/zh/': {
        selectText: '选择语言',
        label: '简体中文',
        editLinkText: '在 GitHub 上编辑此页',
        nav: [
          { text: '指南', link: '/zh/guide/' },
          { text: 'API', link: '/zh/api/' },
          { text: '常见问题', link: '/zh/faq/' },
          { text: '发布日志', link: 'https://github.com/umijs/qiankun/releases' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              title: '指南',
              collapsable: false,
              children: ['', 'getting-started'],
            },
          ],
          '/zh/api/': [''],
          '/zh/faq/': [''],
        },
      },
    },
  },
  plugins: [
    [
      '@vuepress/google-analytics',
      {
        ga: 'UA-157295698-1',
      },
    ],
    [
      '@vuepress/pwa',
      {
        serviceWorker: true,
        updatePopup: {
          '/': {
            message: 'New content is available.',
            buttonText: 'Refresh',
          },
          '/zh/': {
            message: '发现新内容可用',
            buttonText: '刷新',
          },
        },
      },
    ],
  ],
};