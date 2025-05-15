function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function htmlDecode(input) {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
}

function parseISODuration(iso) {
  // Updated regex to handle extended ISO duration format
  const match = iso.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return iso;
  const [, hours, minutes, seconds] = match.map(num => (num ? parseFloat(num) : 0));
  let parts = [];
  if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  return parts.join(', ') || iso;
}

// Directly call main function
main();

// Wrap the main logic in a function
function main() {
  // Function to find most relevant image
  function findMainImage() {
    // Try to find the first <img> element
    const firstImage = document.querySelector('img');
    if (firstImage && firstImage.src) {
      return firstImage.src;
    }

    // Try to find an image inside a <picture> element
    const pictureImage = document.querySelector('picture img');
    if (pictureImage && pictureImage.src) {
      return pictureImage.src;
    }

    // Try to find meta tags with Open Graph image (og:image)
    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage && metaImage.content) {
      return metaImage.content;
    }

    // Try to find meta tags with Twitter card image
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && twitterImage.content) {
      return twitterImage.content;
    }

    // If no image is found, return an empty string
    return '';
  }

  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

  const recipes = scripts
    .map(s => { try { return JSON.parse(s.textContent); } catch (e) { return null; } })
    .flatMap(json => (Array.isArray(json) ? json : [json]))
    .filter(obj => obj && obj['@type'] && (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))));

  if (recipes.length) {
    const recipe = recipes[0];
    const titleRaw = recipe.name || 'Recipe';
    const title = htmlDecode(titleRaw);
    const description = recipe.description || '';
    const ingredients = (recipe.recipeIngredient || []).map(i => `- ${i}`).join('\n');
    const instructions = (recipe.recipeInstructions || [])
      .map(step => (typeof step === 'string' ? step : step.text))
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    const image = recipe.image?.[0] || findMainImage(); 
    const source = window.location.href;
    const prepTime = recipe.prepTime ? parseISODuration(recipe.prepTime) : '';
    const cookTime = recipe.cookTime ? parseISODuration(recipe.cookTime) : '';
    const totalTime = recipe.totalTime ? parseISODuration(recipe.totalTime) : '';
    const recipeYield = recipe.recipeYield || '';
    const keywords = recipe.keywords || '';
    const cuisine = recipe.recipeCuisine || '';
    const category = recipe.recipeCategory || '';
    const author = typeof recipe.author === 'object' ? recipe.author.name : recipe.author || '';
    const nutrition = recipe.nutrition ? Object.entries(recipe.nutrition).filter(([key]) => key !== '@type').map(([key, value]) => `- **${key}**: ${value}`).join('\n') : '';

    const imageBlock = image ? `![Recipe Image](${image})  \n` : '';
    const descriptionBlock = description ? `_${description}_  \n` : '';
    const authorBlock = author ? `**Author**: ${author}  \n` : '';
    const prepBlock = prepTime ? `**Prep Time**: ${prepTime}  \n` : '';
    const cookBlock = cookTime ? `**Cook Time**: ${cookTime}  \n` : '';
    const totalBlock = totalTime ? `**Total Time**: ${totalTime}  \n` : '';
    const yieldBlock = recipeYield ? `**Yield**: ${recipeYield}  \n` : '';
    const cuisineBlock = cuisine ? `**Cuisine**: ${cuisine}  \n` : '';
    const categoryBlock = category ? `**Category**: ${category}  \n` : '';
    const keywordBlock = keywords ? `**Keywords**: ${keywords}  \n` : '';
    const nutritionBlock = nutrition ? `## Nutrition Facts\n${nutrition}  \n` : '';
    
    const markdown = `# ${title}\n\n${imageBlock}**Source:** [${source}](${source})\n\n${descriptionBlock}${authorBlock}${prepBlock}${cookBlock}${totalBlock}${yieldBlock}${cuisineBlock}${categoryBlock}${keywordBlock}\n\n## Ingredients\n${ingredients}\n\n## Instructions\n${instructions}\n\n${nutritionBlock}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFileName(title) + '.md';
    a.click();
    URL.revokeObjectURL(url);

    alert('Recipe Grabbed! Your recipe has been successfully downloaded.');
  } else {
    alert('No Recipe Found. We could not find any recipe on this page.');
  }
}
