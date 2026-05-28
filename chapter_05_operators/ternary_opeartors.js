let isLoggedIn = true;

let message = isLoggedIn ? "Welcome!" : "Please log in";

console.log(message);


let num = 5;

console.log(num % 2 === 0 ? "Even" : "Odd");

let score = 85;

let grade =
    score >= 90 ? "A" :
        score >= 75 ? "B" :
            score >= 50 ? "C" : "Fail";

console.log(grade);

let actualStatusCode = 200;
let expectedStatusCode = 200;


let result = actualStatusCode === expectedStatusCode ? "PASS" : "FAIL";
console.log(result);

console.log(typeof (result));

