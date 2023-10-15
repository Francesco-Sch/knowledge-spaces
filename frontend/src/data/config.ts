const BASE_URL = import.meta.env.PROD
	? 'https://api.knowledge-spaces.com'
	: 'http://localhost:7100';

export { BASE_URL };
