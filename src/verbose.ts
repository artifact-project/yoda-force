let VERBOSE = process.env.hasOwnProperty('--verbose');

interface VERBOSE {
	(...args): void;
	set?(state: boolean): void;
}

export const verbose:VERBOSE = (...args) => {
	VERBOSE && console.log(...args);
};

verbose.set = function (state) {
	VERBOSE = state;
};