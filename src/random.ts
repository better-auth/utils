import { getRandomValues } from "uncrypto";

type Alphabet = "a-z" | "A-Z" | "0-9" | "-_";

function expandAlphabet(alphabet: Alphabet): string {
	switch (alphabet) {
		case "a-z":
			return "abcdefghijklmnopqrstuvwxyz";
		case "A-Z":
			return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		case "0-9":
			return "0123456789";
		case "-_":
			return "-_";
		default:
			throw new Error(`Unsupported alphabet: ${alphabet}`);
	}
}

export function createRandomStringGenerator<A extends Alphabet>(
	...characters: A[]
) {
	const baseCharacterSet = characters.map(expandAlphabet).join("");
	if (baseCharacterSet.length === 0) {
		throw new Error(
			"No valid characters provided for random string generation.",
		);
	}

	const baseCharSetLength = baseCharacterSet.length;

	return <SubA extends Alphabet>(
		length: number,
		...[alphabet]: [SubA?, ...SubA[]]
	) => {
		if (length <= 0) {
			throw new Error("Length must be a positive integer.");
		}

		let characterSet = baseCharacterSet;
		let charSetLength = baseCharSetLength;

		if (alphabet) {
			characterSet = expandAlphabet(alphabet);
			charSetLength = characterSet.length;
		}

		const charArray = new Uint8Array(length);
		getRandomValues(charArray);

		let result = "";
		for (let i = 0; i < length; i++) {
			const index = charArray[i] % charSetLength;
			result += characterSet[index];
		}

		return result;
	};
}
