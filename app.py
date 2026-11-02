from __future__ import annotations

from faker import Faker
from flask import Flask, jsonify, request, send_file

app = Flask(__name__)
faker = Faker()

MAX_TURNS = 6


class GameState:
    def __init__(self):
        self.word_length = 5
        self.current_word = ""
        self.turns_used = 0
        self.guesses = []
        self.incorrect = []
        self.misplaced = []
        self.wins = 0

    def generate_word(self, length: int) -> str:
        while True:
            word = faker.word().lower()
            if word.isalpha() and len(word) == length:
                return word

    def start_new_game(self, word_length: int | None = None):
        if word_length is not None:
            self.word_length = word_length
        self.current_word = self.generate_word(self.word_length)
        self.turns_used = 0
        self.guesses = []
        self.incorrect = []
        self.misplaced = []
        return {
            "word_length": self.word_length,
            "max_turns": MAX_TURNS,
            "turns_left": MAX_TURNS,
        }

    def evaluate_guess(self, guess: str):
        result = ["wrong"] * len(guess)
        remaining = {}

        for index, letter in enumerate(guess):
            if letter == self.current_word[index]:
                result[index] = "correct"
            else:
                remaining[self.current_word[index]] = remaining.get(self.current_word[index], 0) + 1

        for index, letter in enumerate(guess):
            if result[index] == "correct":
                continue
            if letter in self.current_word and remaining.get(letter, 0) > 0:
                result[index] = "misplaced"
                remaining[letter] -= 1

        wrong_letters = []
        misplaced_letters = []

        for letter, status in zip(guess, result):
            if status == "wrong" and letter not in wrong_letters:
                wrong_letters.append(letter)
            if status == "misplaced" and letter not in misplaced_letters:
                misplaced_letters.append(letter)

        self.guesses.append({"value": guess, "result": result})
        self.incorrect = wrong_letters
        self.misplaced = misplaced_letters
        self.turns_used += 1

        won = guess == self.current_word
        game_over = won or self.turns_used >= MAX_TURNS

        return {
            "ok": True,
            "won": won,
            "game_over": game_over,
            "turns_used": self.turns_used,
            "turns_left": max(0, MAX_TURNS - self.turns_used),
            "guesses": self.guesses,
            "incorrect": self.incorrect,
            "misplaced": self.misplaced,
            "answer": self.current_word if won or game_over else None,
        }


game = GameState()


@app.route("/")
def index():
    return send_file("test.html")


@app.route("/style.css")
def css():
    return send_file("style.css")


@app.route("/script.js")
def js():
    return send_file("script.js")


@app.route("/api/new-game", methods=["POST"])
def new_game():
    payload = request.get_json(silent=True) or {}
    word_length = payload.get("word_length", 5)
    try:
        word_length = int(word_length)
    except (TypeError, ValueError):
        word_length = 5

    result = game.start_new_game(word_length)
    return jsonify(result)


@app.route("/api/guess", methods=["POST"])
def guess():
    payload = request.get_json(silent=True) or {}
    guess_text = (payload.get("guess") or "").strip().lower()

    if not guess_text:
        return jsonify({"ok": False, "message": "Please enter a word."}), 400

    if guess_text == "stop":
        return jsonify({"ok": False, "message": "Game stopped."}), 400

    if len(guess_text) != game.word_length or not guess_text.isalpha():
        return jsonify({
            "ok": False,
            "message": f"Please enter a {game.word_length}-letter word using only letters.",
        }), 400

    return jsonify(game.evaluate_guess(guess_text))


if __name__ == "__main__":
    game.start_new_game(5)
    app.run(debug=True)
