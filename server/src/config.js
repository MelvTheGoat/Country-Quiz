export const PORT = Number(process.env.PORT || 4000);

/**
 * Comma-separated list of allowed browser origins, e.g.
 * CLIENT_ORIGIN="https://capitals-quiz.vercel.app,https://quiz.example.com".
 * Unset means "reflect whatever origin asks", which is what you want locally.
 */
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : true;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
