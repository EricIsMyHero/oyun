const hybridGlowBtn = document.getElementById('toggle-hybrid');
const treeBtn = document.getElementById('toggle-tree');
const biomech = document.getElementById('biomech');
const tree = document.getElementById('tree');

hybridGlowBtn.addEventListener('click', () => {
  const overlay = biomech.querySelector('.hybrid');
  overlay.classList.toggle('hidden');
});

treeBtn.addEventListener('click', () => {
  tree.classList.toggle('hidden');
});
