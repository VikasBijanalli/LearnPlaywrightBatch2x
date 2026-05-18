let username = "Vikas";
let loginAttempts = 3;
let isBlocked = false;

if (loginAttempts < 5 && !isBlocked) {
    console.log(username + " can login");
} else {
    console.log("Access denied");
}