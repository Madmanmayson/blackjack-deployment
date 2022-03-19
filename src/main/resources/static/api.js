// Stored Element References
/** @type {HTMLElement} */
const deckIdElement = document.getElementById("deck_id");
/** @type {HTMLElement} */
const errorInfoElement = document.getElementById("error_info");
/** @type {HTMLElement} */
const dealerHandElement = document.getElementById("dealer-hand-display");
/** @type {HTMLElement} */
const playerHandElement = document.getElementById("player-hand-display");
/** @type {HTMLElement} */
const gameWinnerElement = document.getElementById("winner");
/** @type {HTMLElement} */
const playerScoreElement = document.getElementById("player-score");
/** @type {HTMLElement} */
const dealerScoreElement = document.getElementById("dealer-score");
/** @type {HTMLElement} */
const gameResultElementArea = document.getElementById("game-results");
/** @type {HTMLElement} */
const actionBarElementArea = document.getElementById("action-bar");

// API Variables
/** @type {string} */
const mainUriPath = "https://deckofcardsapi.com/api/deck/"
/** @type {number} */
const deckCount = 2;
/** @type {string} */
let deckId = null;
/** @type {boolean} */
let isErrored = false;
/** @type {string} */
const cardBackURI = "https://deckofcardsapi.com/static/img/back.png";

// Game Variables
/** @type {Array} */
let dealerHand = [];
/** @type {Array} */
let playerHand = [];
/** @type {boolean} */
let playerEndTurn = false;
/** @type {boolean} */
let isDealerWin = false;
/** @type {boolean} */
let isGameOver = false;


//Binding Event Listeners
document.getElementById("hit-button").addEventListener('click', hit);
document.getElementById("stay-button").addEventListener('click', stay);
document.getElementById("new-game-button").addEventListener('click', newGame);


// Debug Mode Handling
/** @type {boolean} */
const isDEBUG = false;
if(isDEBUG){
    document.getElementById("debug_display").style.display = "block";
}

/**
 * Starts up the first game of blackjack by first initializing a connection with the API to get the deck_id we will be using.
 */
async function start(){
    //Initial API connection
    let data = new URLSearchParams();
    data.append("deck_count", deckCount);
    await apiRequest("new/shuffle/", "POST", null, data).then((json) => {
        if(json.success){
            deckId = json.deck_id;
            deckIdElement.textContent = deckId;
        }
        else {
            errorInfoElement.textContent = "Failed to connect to API";
            isErrored = true;
        }
    });

    //Setup Initial Game
    if(!isErrored){
        //Draw the initial hands
        await newGame();
    }
}


/* Button Click Functions */

/**
 * Starts up a new game of blackjack, shuffling all removed cards from the previous game back into the deck, 
 * resetting the game variables, and then drawing 2 cards for the player and dealer.
 */
async function newGame(){
    playerHand = [];
    dealerHand = [];
    playerEndTurn = false;
    isDealerWin = false;
    isGameOver = false;

    gameResultElementArea.style.display = "none";
    actionBarElementArea.style.display= "block";

    await apiRequest(deckId + "/shuffle/", "GET", null, null);

    for (let i = 0; i < 4; i++) {
        await drawCard( (i % 2) ? dealerHand : playerHand);
    }
    updateHands();
}

/**
 * Handles the player hitting stay by starting the dealer's turn
 */
function stay(){
    if(!isGameOver){
        playerEndTurn = true;
        dealerPlay();
    }
}

/**
 * Handles the player hitting hit, drawing a new card for the player, if they bust it starts the dealer's turn
 */
async function hit(){
    if(!isGameOver){
        await drawCard(playerHand);

        if(calculateCardValue(playerHand) > 21){
            playerEndTurn = true;
            isDealerWin = true;
            isGameOver = true;
            dealerPlay();
        }
    }
}


/* Support and Helper Functions */

/**
 * Accesses the card deck API to draw a new card from the deck, putting it into the appropriate hand. Then refreshes both player's hand displays
 * @param {Array} targetHand the hand recieving the drawn card
 */
 async function drawCard(targetHand){
    data = new URLSearchParams();
    data.append("count", "1");
    await apiRequest(deckId + "/draw/", "POST", null, data).then((json) => {
        if(json.success){
            targetHand.push(json.cards[0]);
        }
    });
    updateHands();
}

/**
 * Updates the dealer's hand, revealing the hidden card. Then starts to draw cards until reaching one of the end conditions for a game over.
 */
async function dealerPlay(){
    updateDealerHand();

    if(!isDealerWin){
        let playerValue = calculateCardValue(playerHand);
        while(!isGameOver){
            let dealerValue = calculateCardValue(dealerHand);
            if(dealerValue > 21){ // Dealer bust, player wins
                isGameOver = true;
            } else if(dealerValue >= playerValue){ //Dealer scored higher then the player, dealer wins
                isGameOver = true;
                isDealerWin = true;
            } else if(dealerValue >= 17){ //Dealer reached the point limit without reaching the player's value, player wins
                isGameOver = true;
            } else { //Draw a new card otherwise and update the hand.
                await drawCard(dealerHand);
                updateDealerHand();
            }
        }
    }
    processGameOver();
}

/**
 * Displays the final results of the blackjack game, including the winner and the new game button.
 */
function processGameOver(){
    gameResultElementArea.style.display = "block";
    actionBarElementArea.style.display = "none";
    playerScoreElement.textContent = calculateCardValue(playerHand);
    dealerScoreElement.textContent = calculateCardValue(dealerHand);

    if(isDealerWin){
        gameWinnerElement.textContent = "Dealer Wins!"
    } else {
        gameWinnerElement.textContent = "Player Wins!"
    }
}

/**
 * Updates both the dealer's and player's hands if they have cards drawn.
 */
function updateHands(){
    if(dealerHand.length !== 0){
        updateDealerHand();
    }

    if(playerHand.length !== 0){
        updatePlayerHand();
    }
}

/**
 * If the player's turn isn't over the second card in the dealer's hand is kept hidden (there should only be 2 cards in the hand for any valid game at this point).
 * Otherwise all cards are revealed, clearing out old cards each time the function is called in case they were still displayed from last game.
 */
function updateDealerHand(){
    clearChildren(dealerHandElement);

    if(!playerEndTurn){
        let imageElement = document.createElement("img")
        imageElement.setAttribute("src", dealerHand[0].image);

        dealerHandElement.appendChild(imageElement);

        imageElement = document.createElement("img")
        imageElement.setAttribute("src", cardBackURI);

        dealerHandElement.appendChild(imageElement);
    } else {
        for (const card of dealerHand) {
            let imageElement = document.createElement("img")
            imageElement.setAttribute("src", card.image);
    
            dealerHandElement.appendChild(imageElement);
        }
    }
}

/**
 * Reveals all the cards in the player's hand, cleaning up the old cards that might have still been displayed and no longer exist.
 */
function updatePlayerHand(){
    clearChildren(playerHandElement);

    for (const card of playerHand) {
        let imageElement = document.createElement("img")
        imageElement.setAttribute("src", card.image);
        playerHandElement.appendChild(imageElement);
    }
}

/**
 * Standard function for removing all children from a given HTML Element.
 * @param {HTMLElement} element the element you are removing children from.
 */
function clearChildren(element){
    while(element.firstChild){
        element.removeChild(element.firstChild);
    }
}

/**
 * Calculates the numerical blackjack value of all cards in the array, if there is an Ace the maximum value of 11 is used 
 * unless the hand has busted in which case it is calculated with a 1 for the value instead.
 * @param {Array} cardArray the array you wish to calculate the total value of
 * @returns the total value of all cards in the array
 */
function calculateCardValue(cardArray){
    let valueTotal = 0;
    let aceCount = 0;
    for (const card of cardArray) {
        if(["KING", "QUEEN", "JACK"].includes(card.value)){
            valueTotal += 10;
        } else if (card.value === "ACE"){
            valueTotal += 11;
            aceCount++;
        } else {
            valueTotal += parseInt(card.value);
        }
    }

    while(valueTotal > 21 && aceCount > 0){
        valueTotal -= 10;
        aceCount--;
    }
    return valueTotal;
}

/**
 * Standard fetch request format which handles processing the response promise into usable json.
 * @param {string} uri the URI the fetch request is connecting to
 * @param {string} method the RESTful verb
 * @param {object} headers the headers you wish to specify using key-value pairs
 * @param {URLSearchParams} body the data passed in if using a POST request
 * @returns a promise containing the parsed out JSON data
 */
async function apiRequest(uri, method,  headers, body){
    let requestUri = mainUriPath + uri;

    let params = {
        method: method,
        mode: "cors",
    }

    if(method === "POST"){
        if(headers === null){
            headers = {};
        }
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    }

    if(headers !== null){
        params.headers = headers;
    }

    if(body !== null){
        params.body = body;
    }

    return fetch(requestUri, params)
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            return json;
        })
        .catch((err) => {
            console.log(err);
        });
}