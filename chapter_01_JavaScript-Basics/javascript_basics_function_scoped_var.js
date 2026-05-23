let a = 10
console.log(a)

function greet() {
    let a = 20;
    console.log(a)
    if (true) {
        let a = 30;
        console.log(a)
    }
    console.log("latest values is " + a)
}

console.log(a)

greet()