export function createPageUrl(pageName: string) {
    if (!pageName || pageName === 'Home') {
        return '/';
    }
    return '/' + pageName.replace(/ /g, '-');
}