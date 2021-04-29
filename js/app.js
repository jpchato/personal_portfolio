
// Prevent the page from reloading when clicking submit
function init(){
  var form = document.getElementById("myForm");
  form.addEventListener("submit", process, false);
};
function process(e){
  console.log("Yikes!");
  e.preventDefault()
  return false;
};
document.addEventListener("DOMContentLoaded", init, false);

let whatUp = () => {
  console.log('whatup')
}


let myJsFunction = async () => {
  var text=document.getElementById('Pokemon').value.toLowerCase()
  
  console.log(text)
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon/'+text);
    
    const pokemon = response.data;
    
    // console.log(pokemon);
    let pokemonAbilities = pokemon.abilities
    let pokemonSprites = pokemon.sprites.front_default
    console.log(pokemonSprites)
    // console.log(pokemonAbilities)
    $('#pokemonDiv').append('<h4>' + text + '\'s Abilities' + '</h4>')
    $('#pokemonDiv').append('<img src="' + pokemonSprites + '" height="64px" width="64px">')
    for (i=0; i < pokemon.abilities.length; i++){
      let ability = (pokemonAbilities[i].ability.name)
      $('#pokemonDiv').append('<p>'+pokemonAbilities[i].ability.name+'<p>')
    }
    return pokemon;
      } catch (errors) {
        console.error(errors);
      }
}