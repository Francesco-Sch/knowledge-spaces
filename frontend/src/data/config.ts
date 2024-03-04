const BASE_URL = import.meta.env.PROD ? import.meta.env.VITE_BACKEND_URL : 'http://localhost:7100';
console.log('BASE_URL:', BASE_URL);

export { BASE_URL };
