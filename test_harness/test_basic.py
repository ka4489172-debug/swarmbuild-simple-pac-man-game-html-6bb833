import pytest
from game import *

def test_player_movement():
    player = Player()
    player.move('up')
    assert player.position == (0, -1)

def test_dot_collection():
    player = Player()
    dot = Dot()
    assert player.collect_dot(dot) == True

def test_ghost_collision():
    player = Player()
    ghost = Ghost()
    assert player.collide_with_ghost(ghost) == False