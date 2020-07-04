export const trimString = (text: string) => {
  const splitString = text.toLowerCase().split('');
  const trimArray = [];
  let wordCount = 0;

  for (const char of splitString) {
    if (splitString[char] === ' ') {
      continue;
    }
    trimArray.push(splitString[char]);
    wordCount += 1;
  }
  trimArray.sort();
  return { text: trimArray.join(''), count: wordCount };
};

export const levenschteinDistance = (string1: string, string2: string) => {
  const trim1 = trimString(string1);
  const trim2 = trimString(string2);
  const str1 = trim1.text;
  const str2 = trim2.text;
  const diff = Math.abs(trim1.count - trim2.count);

  const small = str1.length < str2.length ? str1 : str2;
  const big = str1.length >= str2.length ? str1 : str2;
  const evenEdits = [];
  const oddEdits = new Array(small.length + 1);
  for (let j = 0; j < small.length + 1; j++) {
    evenEdits.push(j);
  }
  for (let i = 1; i < big.length + 1; i++) {
    let currentEdits: any[];
    let previousEdits;

    if (i % 2 === 1) {
      currentEdits = oddEdits;
      previousEdits = evenEdits;
    } else {
      currentEdits = evenEdits;
      previousEdits = oddEdits;
    }
    currentEdits[0] = i;
    for (let j = 1; j < small.length + 1; j++) {
      if (big[i - 1] === small[j - 1]) {
        currentEdits[j] = previousEdits[j - 1];
      } else {
        currentEdits[j] =
          1 +
          Math.min(previousEdits[j - 1], previousEdits[j], currentEdits[j - 1]);
      }
    }
  }
  const distance =
    big.length % 2 === 0 ? evenEdits[small.length] : oddEdits[small.length];
  const match = distance <= diff || distance <= 3;
  return { distance, match, diff };
};
